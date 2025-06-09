import fs from 'node:fs/promises'
import path from 'node:path'

import * as imageTool from '@candriajs/image-tool'
import AdmZip from 'adm-zip'
import type { Client, GfsDirStat, GfsFileStat } from 'icqq'
import karin, { common, exists, karinPathTemp, logger, Message, segment } from 'node-karin'

import { utils } from '@/models'
import { Version } from '@/root'

const getType = 'buffer'

export const flip_horizontal = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:水平翻转)(?:图片)?$/i, async (e: Message) => {
  try {
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    const result = imageTool.image_flip_horizontal(image_buffer as Buffer)
    await e.reply([segment.image(`base64://${result.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`水平翻转图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:水平翻转',
  priority: -Infinity,
  event: 'message'
})

export const flip_vertical = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:垂直翻转)(?:图片)?$/i, async (e: Message) => {
  try {
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    const reslut = imageTool.image_flip_vertical(image_buffer as Buffer)
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]垂直翻转图片图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:垂直翻转',
  priority: -Infinity,
  event: 'message'
})

export const rotate = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:旋转)(?:图片)?(?:\s*(\d+))?$/i, async (e: Message) => {
  try {
    const [, angle] = e.msg.match(rotate.reg)!
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    if (!angle) {
      return await e.reply('请输入旋转角度')
    }
    const result = imageTool.image_rotate(image_buffer as Buffer, parseInt(angle))
    await e.reply([segment.image(`base64://${result.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]旋转图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:旋转',
  priority: -Infinity,
  event: 'message'
})

export const resize = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:缩放)(?:图片)?(?:\s*(\d+)(?:x(\d+)?|%)?)?$/i, async (e: Message) => {
  try {
    const [, width, height] = e.msg.match(resize.reg)!
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    if (!width || !height) {
      return await e.reply('请输入正确的尺寸格式, 如:100x100,100x,50%')
    }

    const image_info = imageTool.image_info(image_buffer as Buffer)
    let finalWidth: number
    let finalHeight: number

    if (width.endsWith('%')) {
      /** 百分比缩放 */
      const scale = parseInt(width) / 100
      finalWidth = Math.floor(image_info.width * scale)
      finalHeight = Math.floor(image_info.height * scale)
    } else {
      /** 固定尺寸缩放 */
      finalWidth = parseInt(width)
      finalHeight = height ? parseInt(height) : Math.floor(image_info.height * (finalWidth / image_info.width))
    }

    const reslut = imageTool.image_resize(image_buffer as Buffer, finalWidth, finalHeight)
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]缩放图片失败:${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:缩放',
  priority: -Infinity,
  event: 'message'
})

export const crop = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:裁剪)(?:图片)?(?:\s*([\d:x,]+))?$/i, async (e: Message) => {
  try {
    const [, cropParam] = e.msg.match(crop.reg)!
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    if (!cropParam) {
      return await e.reply('请输入正确的裁剪格式 ,如:[0,0,100,100],[100x100],[2:1]')
    }

    const image_info = imageTool.image_info(image_buffer as Buffer)
    let left: number, top: number, right: number, bottom: number

    if (cropParam.includes(',')) {
      [left, top, right, bottom] = cropParam.split(',').map(n => parseInt(n))
    } else if (cropParam.includes('x')) {
      const [width, height] = cropParam.split('x').map(n => parseInt(n))
      left = 0
      top = 0
      right = width
      bottom = height
    } else if (cropParam.includes(':')) {
      const [widthRatio, heightRatio] = cropParam.split(':').map(n => parseInt(n))
      const ratio = widthRatio / heightRatio
      if (image_info.width / image_info.height > ratio) {
        const newWidth = Math.floor(image_info.height * ratio)
        left = Math.floor((image_info.width - newWidth) / 2)
        top = 0
        right = left + newWidth
        bottom = image_info.height
      } else {
        const newHeight = Math.floor(image_info.width / ratio)
        left = 0
        top = Math.floor((image_info.height - newHeight) / 2)
        right = image_info.width
        bottom = top + newHeight
      }
    } else {
      return await e.reply('请输入正确的裁剪格式 ,如:[0,0,100,100],[100x100],[2:1]')
    }
    const result = imageTool.image_crop(image_buffer as Buffer, left, top, right, bottom)
    await e.reply([segment.image(`base64://${result.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]裁剪图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:裁剪',
  priority: -Infinity,
  event: 'message'
})

export const grayscale = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:灰度化)(?:图片)?$/i, async (e: Message) => {
  try {
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    const reslut = imageTool.image_grayscale(image_buffer as Buffer)
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]灰度化图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:灰度化',
  priority: -Infinity,
  event: 'message'
})

export const invert = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:反色)(?:图片)?$/i, async (e: Message) => {
  try {
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    const reslut = imageTool.image_invert(image_buffer as Buffer)
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]反色图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:反色',
  priority: -Infinity,
  event: 'message'
})

export const color_mask = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:颜色滤镜)(?:\s*(\S+))?$/i, async (e: Message) => {
  try {
    const [, color] = e.msg.match(color_mask.reg)!
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    if (!color) {
      return await e.reply('请输入正确的颜色格式,如: [#ff0000]')
    }
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/i
    if (!hexColorRegex.test(color)) {
      return await e.reply('颜色格式无效, 请输入标准的6位16进制颜色代码: \n例如: #ff0000 (红色)')
    }
    const reslut = imageTool.image_color_mask(image_buffer as Buffer, color)
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]颜色滤镜图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:颜色滤镜',
  priority: -Infinity,
  event: 'message'
})

export const merge_horizontal = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:水平拼接)(?:图片)?$/i, async (e: Message) => {
  try {
    const images = await utils.get_image(e, getType)
    if (!images || images.length < 2) {
      return await e.reply('请发送至少两张图片进行合并', { reply: true })
    }
    const image_buffers = await Promise.all(
      images.map(img => img.image)
    )
    const reslut = imageTool.image_merge_horizontal(image_buffers as Buffer[])
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]水平拼接图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:水平拼接',
  priority: -Infinity,
  event: 'message'
})

export const merge_vertical = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:垂直拼接)(?:图片)?$/i, async (e: Message) => {
  try {
    const images = await utils.get_image(e, getType)
    if (!images || images.length < 2) {
      return await e.reply('请发送至少两张图片进行垂直拼接', { reply: true })
    }
    const image_buffers = await Promise.all(
      images.map(img => img.image)
    )
    const reslut = imageTool.image_merge_vertical(image_buffers as Buffer[])
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]垂直拼接图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:垂直拼接',
  priority: -Infinity,
  event: 'message'
})

export const gif_split = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:分解)$/i, async (e: Message) => {
  try {
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    const reslut = imageTool.gif_split(image_buffer as Buffer)

    const images = await Promise.all(
      reslut.map(imgs => imgs.toString('base64'))
    )
    const zip = new AdmZip()
    images.forEach((img, index) => {
      zip.addFile(`image_${index}.png`, Buffer.from((img), 'base64'))
    })
    const timestamp = Date.now()
    const zipPath = path.join(karinPathTemp, Version.Plugin_Name, 'gif', `gif分解-${timestamp}.zip`)
    const zipName = path.basename(zipPath)
    zip.writeZip(zipPath)
    try {
      const fileBuffer = await fs.readFile(zipPath)
      const file = `base64://${fileBuffer.toString('base64')}`
      const type = e.isGroup ? 'group' : 'private'
      const id = e.isGroup ? e.groupId : e.userId
      await utils.send_file(type, Number(e.bot.selfId), Number(id), file, zipName)

      if (await exists(zipPath)) {
        await fs.rm(zipPath)
      }
      if (e.isGroup) {
        setTimeout(async () => {
          try {
            let filesList
            const platform = e.bot.adapter.standard
            if (platform === 'onebot11') {
              filesList = await (e.bot as unknown as any).sendApi!('get_group_root_files', {
                group_id: e.groupId
              })
            } else if (platform === 'icqq') {
              filesList = await (e.bot.super as Client).pickGroup(Number(e.groupId)).fs.ls()
            }
            let matchedFile
            if (platform === 'icqq') {
              matchedFile = filesList.find((file: GfsFileStat | GfsDirStat) => file.name === zipName)
            } else {
              const filesArray = Array.isArray(filesList) ? filesList : (filesList.files ?? [])
              matchedFile = filesArray.find((file: any) => file.file_name === zipName)
            }
            let fid
            if (matchedFile) {
              if (platform === 'icqq') {
                fid = matchedFile.fid
              } else {
                fid = matchedFile.file_id
              }
            } else {
              return logger.warn('未找到上传的文件fid, 跳过删除群文件')
            }
            if (platform === 'onebot11') {
              await (e.bot as unknown as any).sendApi!('delete_group_file', {
                group_id: e.groupId,
                file_id: fid
              })
            } else if (platform === 'icqq') {
              await (e.bot.super as Client).pickGroup(Number(e.groupId)).fs.rm(fid)
            }
          } catch (error) {
            logger.warn('删除群文件失败, 跳过删除群文件')
          }
        }, 10 * 60 * 1000)
      }
    } catch (error) {
      logger.warn('上传文件失败, 跳过文件发送')
      if (await exists(zipPath)) {
        await fs.rm(zipPath)
      }
    }

    const replyMessage = [
      segment.text('============\n'),
      segment.text('原图:\n'),
      segment.image(`base64://${image_buffer.toString('base64')}`),
      segment.text('============\n'),
      segment.text('分解后的图片:\n'),
      ...images.map(img => segment.image(`base64://${img}`))
    ]

    const forWordMsg = common.makeForward(replyMessage, e.bot.selfId, e.bot.selfName)

    await e.bot.sendForwardMsg(e.contact, forWordMsg, {
      news: [{ text: 'GIF分解' }],
      prompt: 'GIF分解',
      summary: Version.Plugin_AliasName,
      source: 'GIF分解'
    })
  } catch (error) {
    logger.error(error)
    await e.reply(`GIF分解失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:GIF分解',
  priority: -Infinity,
  event: 'message'
})

export const gif_merge = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:合并|拼接|合成)(?:\s*(\S+))?$/i, async (e: Message) => {
  try {
    const [, duration] = e.msg.match(gif_merge.reg)!
    const images = await utils.get_image(e, getType)
    if (!images || images.length < 2) {
      return await e.reply('请发送至少两张图片进行拼接', { reply: true })
    }
    const image_buffers = await Promise.all(
      images.map(img => img.image)
    )
    const reslut = imageTool.gif_merge(image_buffers as Buffer[], Number(duration))
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]gif拼接图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:gif合并',
  priority: -Infinity,
  event: 'message'
})

export const gif_reverse = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:反转)$/i, async (e: Message) => {
  try {
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    const reslut = imageTool.gif_reverse(image_buffer as Buffer)
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]gif反转图片失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:gif反转',
  priority: -Infinity,
  event: 'message'
})

export const gif_change_duration = karin.command(/^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:变速|改变帧率)(?:\s*(\d{0,3}\.?\d{1,3}(?:fps|ms|s|x|倍速?|%)?))?$/i, async (e: Message) => {
  try {
    const [, param] = e.msg.match(gif_change_duration.reg)!
    const image = await utils.get_image(e, getType)
    const image_buffer = image && image.length > 0 ? image[0].image : null

    if (!image_buffer) {
      return await e.reply('请发送图片', { reply: true })
    }
    if (!param) {
      return await e.reply('请使用正确的倍率格式,如:[0.5x],[50%],[20FPS],[0.05s]', { reply: true })
    }
    const image_info = imageTool.image_info(image_buffer as Buffer)
    if (!image_info.is_multi_frame) {
      return await e.reply('该图片不是动图,无法进行变速操作', { reply: true })
    }
    let duration: number

    const fps_match = param.match(/(\d{0,3}\.?\d{1,3})fps$/i)
    const time_match = param.match(/(\d{0,3}\.?\d{1,3})s$/i)
    const speed_match = param.match(/(\d{0,3}\.?\d{1,3})(?:x|倍速?)$/i)
    const percent_match = param.match(/(\d{0,3}\.?\d{1,3})%$/)

    if (fps_match) {
      duration = 1 / parseFloat(fps_match[1])
    } else if (time_match) {
      duration = parseFloat(time_match[1])
    } else {
      duration = image_info.average_duration!

      if (speed_match) {
        duration /= parseFloat(speed_match[1])
      } else if (percent_match) {
        duration = duration * (100 / parseFloat(percent_match[1]))
      } else {
        return await e.reply('请使用正确的倍率格式,如:[0.5x],[50%],[20FPS],[0.05s]', { reply: true })
      }
    }

    if (duration < 0.02) {
      return await e.reply([
        segment.text('帧间隔必须大于 0.02 s(小于等于 50 FPS),\n'),
        segment.text('超过该限制可能会导致 GIF 显示速度不正常.\n'),
        segment.text(`当前帧间隔为 ${duration.toFixed(3)} s (${(1 / duration).toFixed(1)} FPS)`)
      ])
    }

    const reslut = imageTool.gif_change_duration(image_buffer as Buffer, duration)
    await e.reply([segment.image(`base64://${reslut.toString('base64')}`)])
  } catch (error) {
    logger.error(error)
    await e.reply(`[${Version.Plugin_AliasName}]GIF变速失败: ${(error as Error).message}`)
  }
}, {
  name: '柠糖图片操作:GIF变速',
  priority: -Infinity,
  event: 'message'
})
