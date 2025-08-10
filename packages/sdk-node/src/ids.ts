import { createHash } from 'crypto'

export function generateId(prompt: string, model: string, timestamp: string): string {
  const input = `${prompt}${model}${timestamp}${process.pid}`
  const hash = createHash('sha1').update(input).digest('hex')
  return hash.slice(0, 16) // 16 character ID
}
