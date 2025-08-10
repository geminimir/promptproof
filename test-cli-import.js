// Test that CLI can import evaluator
try {
  const { Evaluator } = require('./packages/evaluator/dist/index.js');
  console.log('✅ CLI can import evaluator successfully');
} catch (error) {
  console.error('❌ CLI cannot import evaluator:', error.message);
  process.exit(1);
}
