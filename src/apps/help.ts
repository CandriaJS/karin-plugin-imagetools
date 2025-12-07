import karin, { Message, segment } from 'node-karin'
import { Render } from '@/common'
import type { HelpGroup } from '@puniyu/component'
import { Version } from '@/root'
import fs from 'node:fs'

export const help = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))(?:命令|帮助|菜单|help|说明|功能|指令|使用说明)$/i,
  async (e: Message) => {
    const imageIcon = await fs.promises.readFile(
      `${Version.Plugin_Path}/resources/icons/image.png`,
    )
    const List: HelpGroup = {
      name: '常用操作',
      list: [
        { name: '#图片信息', desc: '查看图片信息', icon: imageIcon },
        { name: '#水平翻转', desc: '水平翻转图片', icon: imageIcon },
        { name: '#垂直翻转', desc: '垂直翻转图片', icon: imageIcon },
        { name: '#灰度化', desc: '灰度化图片', icon: imageIcon },
        { name: '#幻影坦克', desc: '将一张图片幻影坦克化', icon: imageIcon },
        { name: '#抠图', desc: '图片抠图', icon: imageIcon },
        { name: '#反色', desc: '将一张图片反色化', icon: imageIcon },
        {
          name: '#颜色滤镜 + rgb',
          desc: '将颜色滤镜应用到一张图片上',
          icon: imageIcon,
        },
        {
          name: '#旋转 + 旋转角度',
          desc: '旋转一张图片指定角度',
          icon: imageIcon,
        },
        {
          name: '#缩放 + 缩放比例',
          desc: '缩放一张图片指定比例',
          icon: imageIcon,
        },
        { name: '#水平拼接', desc: '将多张图片水平拼接', icon: imageIcon },
        { name: '#垂直拼接', desc: '将多张图片垂直拼接', icon: imageIcon },
        { name: '#gif分解', desc: '将gif图片分解', icon: imageIcon },
        {
          name: '#gif合成[速度:秒]',
          desc: '将多张图片合成成gif',
          icon: imageIcon,
        },
        { name: '#gif变速[速度]', desc: '变速gif图片', icon: imageIcon },
      ],
    }

    const helpList: HelpGroup[] = [List]

    if (e.isMaster) {
      const updateIcon = await fs.promises.readFile(
        `${Version.Plugin_Path}/resources/icons/update.png`,
      )
      helpList.push({
        name: '管理命令',
        list: [{ name: '#imagetools更新', desc: '更新插件', icon: updateIcon }],
      })
    }
    const bg = await fs.promises.readFile(
      `${Version.Plugin_Path}/resources/background.webp`,
    )

    const img = await Render.help({
      title: "柠糖图片操作",
      theme: {
        backgroundImage: bg,
      },
      list: helpList,
    })

    await e.reply(segment.image(`base64://${img.toString('base64')}`))
    return true
  },
  {
    name: '柠糖图片操作:帮助',
    priority: 500,
    event: 'message',
    permission: 'all',
  },
)
