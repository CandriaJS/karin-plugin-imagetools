import * as imageTool from '@candriajs/image-tool'
import karin, { logger, Message, segment } from 'node-karin'

import { utils } from '@/models'
import { Version } from '@/root'

export const info = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:查看)?(?:图片信息|imageinfo)$/i, async (e: Message) => {
  try {
    const getType = 'buffer'
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    const image_info = imageTool.image_info(image_buffer as Buffer)
    const replyMessage = [
      segment.image(`base64://${image_buffer.toString('base64')}`),
      segment.text('图片信息:\n'),
      segment.text(`分辨率: ${image_info.width}x${image_info.height}\n`),
      segment.text(`是否为动图: ${image_info.is_multi_frame}\n`)
    ]
    if (image_info.is_multi_frame) {
      replyMessage.push(segment.text(`帧数: ${image_info.frame_count}\n`))
      replyMessage.push(segment.text(`动图平均帧率: ${image_info.average_duration}\n`))
    }
    await e.reply(replyMessage, { reply: true })
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]获取图片信息失败: ${(error as Error).message}`, { reply: true })
  }
}, {
  name: '柠糖表情:图片操作:查看图片信息',
  priority: -Infinity,
  event: 'message'
})
