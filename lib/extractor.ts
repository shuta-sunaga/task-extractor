export type TaskAnalysis = {
  isTask: boolean
  taskContent: string
  priority: 'high' | 'medium' | 'low'
}

// 抽出ルール定義
const RULES = [
  { pattern: /【緊急】(.+?)(?:\n|$)/, priority: 'high' as const },
  { pattern: /【依頼】(.+?)(?:\n|$)/, priority: 'medium' as const },
  { pattern: /【確認】(.+?)(?:\n|$)/, priority: 'low' as const },
]

export function analyzeMessage(message: string): TaskAnalysis {
  for (const rule of RULES) {
    const match = message.match(rule.pattern)
    if (match) {
      return {
        isTask: true,
        taskContent: match[1].trim(),
        priority: rule.priority,
      }
    }
  }

  return {
    isTask: false,
    taskContent: '',
    priority: 'medium',
  }
}
