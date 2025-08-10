"""
PromptProof SDK wrapper for Anthropic Python client
"""
import json
import os
import time
import random
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
import re


class PromptProofWrapper:
    """Wrapper for Anthropic client to record LLM outputs"""
    
    def __init__(self, client, suite: str, source: Optional[str] = None, 
                 sample_rate: float = 1.0, redact: bool = True,
                 output_dir: str = "fixtures"):
        self.client = client
        self.suite = suite
        self.source = source or os.getenv("ENV", "production")
        self.sample_rate = sample_rate or float(os.getenv("PP_SAMPLE_RATE", "1.0"))
        self.redact = redact
        self.output_dir = output_dir or os.getenv("PP_OUTPUT_DIR", "fixtures")
        self.should_record = os.getenv("PP_RECORD") == "1" or os.getenv("ENV") == "development"
        
        # Ensure output directory exists
        if self.should_record:
            output_path = Path(self.output_dir) / self.suite
            output_path.mkdir(parents=True, exist_ok=True)
            self.output_file = output_path / "outputs.jsonl"
    
    def __getattr__(self, name):
        """Proxy all attributes to the underlying client"""
        attr = getattr(self.client, name)
        
        # Intercept messages.create
        if name == "messages":
            return self._wrap_messages(attr)
        
        return attr
    
    def _wrap_messages(self, messages_obj):
        """Wrap the messages object to intercept create calls"""
        class MessagesWrapper:
            def __init__(self, wrapped, parent):
                self.wrapped = wrapped
                self.parent = parent
            
            def __getattr__(self, name):
                attr = getattr(self.wrapped, name)
                if name == "create":
                    return self.parent._wrap_create(attr)
                return attr
        
        return MessagesWrapper(messages_obj, self)
    
    def _wrap_create(self, create_fn):
        """Wrap the create function to record outputs"""
        def wrapped(**kwargs):
            # Decide whether to record
            if not self.should_record or random.random() > self.sample_rate:
                return create_fn(**kwargs)
            
            start_time = time.time()
            
            try:
                # Call original function
                response = create_fn(**kwargs)
                end_time = time.time()
                
                # Create fixture record
                record = self._create_record(kwargs, response, start_time, end_time)
                
                # Redact if needed
                if self.redact:
                    record = self._redact_record(record)
                
                # Write to file
                self._append_record(record)
                
                return response
            except Exception as e:
                # Don't interfere with errors
                raise e
        
        return wrapped
    
    def _create_record(self, request: Dict, response: Any, start_time: float, end_time: float) -> Dict:
        """Create a fixture record from request and response"""
        # Extract output
        output = {}
        if hasattr(response, 'content'):
            if isinstance(response.content, list):
                for item in response.content:
                    if hasattr(item, 'text'):
                        output['text'] = item.text
                    elif hasattr(item, 'type') and item.type == 'text':
                        output['text'] = item.text
            elif hasattr(response.content, 'text'):
                output['text'] = response.content.text
        
        # Calculate metrics
        latency_ms = int((end_time - start_time) * 1000)
        
        # Extract usage
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, 'usage'):
            input_tokens = getattr(response.usage, 'input_tokens', 0)
            output_tokens = getattr(response.usage, 'output_tokens', 0)
        
        cost_usd = self._calculate_cost(request.get('model', ''), input_tokens, output_tokens)
        
        return {
            'schema_version': 'pp.v1',
            'id': self._generate_id(),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'source': self.source,
            'input': {
                'prompt': self._format_messages(request.get('messages', [])),
                'params': {
                    'model': request.get('model', 'claude-3-sonnet'),
                    'temperature': request.get('temperature'),
                    'max_tokens': request.get('max_tokens'),
                    'top_p': request.get('top_p'),
                    'top_k': request.get('top_k')
                }
            },
            'output': output,
            'metrics': {
                'latency_ms': latency_ms,
                'cost_usd': cost_usd,
                'input_tokens': input_tokens,
                'output_tokens': output_tokens
            },
            'redaction': {
                'status': 'sanitized' if self.redact else 'raw',
                'methods': ['sdk_auto_redact'] if self.redact else []
            }
        }
    
    def _format_messages(self, messages: list) -> str:
        """Format messages into a string"""
        if not messages:
            return ""
        
        formatted = []
        for msg in messages:
            if isinstance(msg, dict):
                role = msg.get('role', 'unknown')
                content = msg.get('content', '')
                formatted.append(f"{role}: {content}")
        
        return "\n".join(formatted)
    
    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate estimated cost based on model and tokens"""
        costs = {
            'claude-3-opus': {'input': 0.000015, 'output': 0.000075},
            'claude-3-sonnet': {'input': 0.000003, 'output': 0.000015},
            'claude-3-haiku': {'input': 0.00000025, 'output': 0.00000125},
            'claude-2.1': {'input': 0.000008, 'output': 0.000024},
            'claude-2.0': {'input': 0.000008, 'output': 0.000024}
        }
        
        # Find matching model
        model_key = None
        for key in costs.keys():
            if key in model.lower():
                model_key = key
                break
        
        if not model_key:
            model_key = 'claude-3-sonnet'  # Default
        
        cost = costs[model_key]
        return (input_tokens * cost['input']) + (output_tokens * cost['output'])
    
    def _redact_record(self, record: Dict) -> Dict:
        """Redact PII from record"""
        patterns = [
            (r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[EMAIL]'),
            (r'\b\+?\d[\d\s().-]{7,}\b', '[PHONE]'),
            (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),
            (r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[CC]')
        ]
        
        def redact_string(text: str) -> str:
            for pattern, replacement in patterns:
                text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
            return text
        
        # Redact input
        if 'prompt' in record.get('input', {}):
            record['input']['prompt'] = redact_string(record['input']['prompt'])
        
        # Redact output
        if 'text' in record.get('output', {}):
            record['output']['text'] = redact_string(record['output']['text'])
        
        record['redaction']['status'] = 'sanitized'
        return record
    
    def _append_record(self, record: Dict):
        """Append record to JSONL file"""
        with open(self.output_file, 'a') as f:
            f.write(json.dumps(record) + '\n')
    
    def _generate_id(self) -> str:
        """Generate unique ID"""
        import uuid
        return str(uuid.uuid4())[:8]


def with_promptproof(client, suite: str, **kwargs):
    """
    Wrap an Anthropic client with PromptProof recording
    
    Usage:
        import anthropic
        from promptproof_anthropic import with_promptproof
        
        client = anthropic.Anthropic(api_key="...")
        client = with_promptproof(client, suite="my-suite", source="production")
        
        # Use client normally
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            messages=[{"role": "user", "content": "Hello!"}],
            max_tokens=100
        )
    """
    return PromptProofWrapper(client, suite, **kwargs)
