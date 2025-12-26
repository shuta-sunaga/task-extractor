/**
 * メッセージ元URLを生成するユーティリティ
 * 各メッセンジャーツールのメッセージへのリンクを生成
 */

export type Source = 'chatwork' | 'teams' | 'lark' | 'slack'

type MessageUrlParams = {
  source: Source
  roomId: string
  messageId: string
  // Teams用の追加パラメータ
  serviceUrl?: string
}

/**
 * メッセージ元URLを生成
 * @returns URL文字列、または生成できない場合はnull
 */
export function generateMessageUrl(params: MessageUrlParams): string | null {
  const { source, roomId, messageId, serviceUrl } = params

  switch (source) {
    case 'chatwork':
      // Chatwork: https://www.chatwork.com/#!rid{room_id}-{message_id}
      return `https://www.chatwork.com/#!rid${roomId}-${messageId}`

    case 'slack':
      // Slack: https://app.slack.com/archives/{channel}/p{timestamp}
      // timestampからドットを除去
      const slackTs = messageId.replace('.', '')
      return `https://app.slack.com/archives/${roomId}/p${slackTs}`

    case 'teams':
      // Teams: serviceUrlが必要
      // 現時点ではserviceUrlを保存していないため、将来の実装用
      if (serviceUrl) {
        // Teams deep link format (簡易版)
        // 完全なdeep linkはより複雑だが、基本的な形式
        return `${serviceUrl}conversations/${roomId}?messageId=${messageId}`
      }
      return null

    case 'lark':
      // Lark: チャットレベルのリンクのみ（特定メッセージへのジャンプは非対応）
      // https://applink.larksuite.com/client/chat/open?openChatId={chat_id}
      return `https://applink.larksuite.com/client/chat/open?openChatId=${roomId}`

    default:
      return null
  }
}

/**
 * ソースに応じたリンクの説明を取得
 */
export function getMessageUrlDescription(source: Source): string {
  switch (source) {
    case 'chatwork':
      return 'Chatworkでメッセージを開く'
    case 'slack':
      return 'Slackでメッセージを開く'
    case 'teams':
      return 'Teamsで会話を開く'
    case 'lark':
      return 'Larkでチャットを開く'
    default:
      return 'メッセージを開く'
  }
}
