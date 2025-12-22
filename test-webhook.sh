# テスト用のChatwork Webhookリクエスト
# 署名なしでテスト（署名検証エラーが返るはず）
curl -X POST https://task-extractor-ten.vercel.app/api/webhook/chatwork \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_setting_id": "test",
    "webhook_event_type": "message_created",
    "webhook_event_time": 1234567890,
    "webhook_event": {
      "room_id": 123456789,
      "message_id": "test123",
      "account_id": 1,
      "body": "この資料を確認してください。よろしくお願いします。",
      "send_time": 1234567890,
      "update_time": 1234567890
    }
  }'
