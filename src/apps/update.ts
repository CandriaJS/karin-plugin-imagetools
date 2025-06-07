import
karin,
{
  common,
  ExecException,
  logger,
  Message,
  restart,
  updatePkg
} from 'node-karin'

import { utils } from '@/models'
import { Version } from '@/root'

async function updateNpmPackage (version: string, pluginName: string) {
  const resolve = await updatePkg(pluginName, version)
  return {
    data: resolve.data,
    status: resolve.status
  }
}

export const update = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))更新$/i, async (e: Message) => {
  let status: 'ok' | 'failed' | 'error' = 'failed'
  let data: ExecException | string = ''

  const result = await updateNpmPackage('latest', Version.Plugin_Name)
  data = result.data
  status = result.status
  logger.debug(data)
  await e.bot.sendForwardMsg(e.contact, common.makeForward(JSON.stringify(data).slice(1, -1), e.bot.account.selfId, e.bot.account.name), { news: [{ text: `更新${Version.Plugin_Name}` }], prompt: `更新${Version.Plugin_Name}`, summary: Version.Plugin_Name, source: '更新插件' })
  if (status === 'ok') {
    try {
      await e.reply(`\n更新完成, 开始重启 本次运行时间：${common.uptime()}`, { reply: true })
      await restart(e.selfId, e.contact, e.messageId)
      return true
    } catch (error) {
      await e.reply(`${Version.Plugin_Name}重启失败，请手动重启以应用更新！`)
    }
  }
  return true
}, {
  name: '柠糖图片操作:更新',
  priority: -Infinity,
  event: 'message',
  permission: 'master'
})
