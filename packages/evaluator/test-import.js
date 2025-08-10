// Simple test to verify the evaluator can be imported
const { Evaluator } = require('./dist/index.js');
console.log('✅ Evaluator imported successfully');
console.log('Available exports:', Object.keys(require('./dist/index.js')));
