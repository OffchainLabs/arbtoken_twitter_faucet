import { WebClient } from '@slack/web-api'
require('dotenv').config()

const token = process.env.SLACK_TOKEN;

const web = new WebClient(token);
// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
const conversationId = process.env.SLACK_CHANNEL_ID;

export const messageSlack = async (text:string) => {
  const res = await web.chat.postMessage({ channel: conversationId, text });
  console.log('Slack message sent: ', res.ts);
}
