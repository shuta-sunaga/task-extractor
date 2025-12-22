import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export type TaskAnalysis = {
  isTask: boolean
  taskContent: string
  priority: 'high' | 'medium' | 'low'
}

export async function analyzeMessage(message: string): Promise<TaskAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `以下のチャットメッセージを分析し、これが依頼やタスクかどうかを判定してください。

判定基準：
- 「お願い」「対応して」「確認して」「やって」「してください」などの依頼表現
- 質問形式での依頼（「〜できますか？」「〜してもらえますか？」）
- 締め切りや期限の言及
- 作業や対応が必要な内容

メッセージ:
${message}

以下のJSON形式で回答してください（他の文章は含めないでください）：
{
  "isTask": true または false,
  "taskContent": "タスクの場合、簡潔に要約した内容。タスクでない場合は空文字",
  "priority": "high"（緊急・今日中）、"medium"（通常）、"low"（いつでも良い）のいずれか
}
`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // JSONを抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { isTask: false, taskContent: '', priority: 'medium' }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      isTask: Boolean(parsed.isTask),
      taskContent: String(parsed.taskContent || ''),
      priority: ['high', 'medium', 'low'].includes(parsed.priority)
        ? parsed.priority
        : 'medium',
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    return { isTask: false, taskContent: '', priority: 'medium' }
  }
}
