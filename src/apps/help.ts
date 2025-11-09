import MarkdownIt from 'markdown-it'
import karin, { Message, requireFile } from 'node-karin'
import { Render } from '@/common'
import { Version } from '@/root'

export const help = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))(?:命令|帮助|菜单|help|说明|功能|指令|使用说明)$/i,
  async (e: Message) => {
    const role = e.isMaster ? 'master' : 'member'
    const img = await Render.render('help/index', {
      role: role,
    })
    await e.reply(img)
    return true
  },
  {
    name: '柠糖图片操作:帮助',
    priority: 500,
    event: 'message',
    permission: 'all',
  },
)

export const version = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))(?:版本|版本信息|version|versioninfo)$/i,
  async (e: Message) => {
    const md = new MarkdownIt({ html: true })
    const makdown = md.render(
      await requireFile(`${Version.Plugin_Path}/CHANGELOG.md`),
    )
    const img = await Render.render('help/version-info', {
      Markdown: makdown,
    })
    await e.reply(img)
    return true
  },
  {
    name: 'karin-plugin-image-tools:version',
    priority: 500,
    event: 'message',
    permission: 'all',
  },
)
