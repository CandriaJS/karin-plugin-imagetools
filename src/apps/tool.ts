import fs from 'node:fs/promises'
import path from 'node:path'
import {
  FlipMode,
  Image,
  ImageFormat,
  MergeMode,
  Rgb,
} from '@puniyu/piccy'
import { Client as GClient } from '@gradio/client'
import AdmZip from 'adm-zip'
import type { Client, GfsDirStat, GfsFileStat } from 'icqq'
import karin, {
  common,
  exists,
  karinPathTemp,
  logger,
  Message,
  segment,
} from 'node-karin'

import { Config } from '@/common'
import { utils } from '@/models'
import { Version } from '@/root'

const getType = 'buffer'

export const flip_horizontal = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:水平翻转)(?:图片)?$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      const result = Image.fromBytes(image_buffer).flip(FlipMode.Horizontal).toBase64();
      await e.reply([segment.image(`base64://${result}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(`水平翻转图片失败: ${(error as Error).message}`)
    }
  },
  {
    name: 'karin-plugin-image-tools:imageFlipHorizontal',
    priority: 500,
    event: 'message',
  },
)

export const flip_vertical = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:垂直翻转)(?:图片)?$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      const result = Image.fromBytes(image_buffer).flip(FlipMode.Vertical).toBase64()
      await e.reply([segment.image(`base64://${result}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]垂直翻转图片图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageFlipVertical',
    priority: 500,
    event: 'message',
  },
)

export const rotate = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:旋转)(?:图片)?(?:\s*(\d+))?$/i,
  async (e: Message) => {
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
      const result = Image.fromBytes(image_buffer).rotate(parseInt(angle)).toBase64()
      await e.reply([segment.image(`base64://${result}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]旋转图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageRotate',
    priority: 500,
    event: 'message',
  },
)

export const resize = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:缩放)(?:图片)?(?:\s*(\d+)(?:x(\d+)?|%)?)?$/i,
  async (e: Message) => {
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

      const img = Image.fromBytes(image_buffer)
      const image_info = img.info()
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
        finalHeight = height
          ? parseInt(height)
          : Math.floor(image_info.height * (finalWidth / image_info.width))
      }

      const reslut = img.resize(finalWidth, finalHeight).toBase64()
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]缩放图片失败:${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageResize',
    priority: 500,
    event: 'message',
  },
)

export const crop = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:裁剪)(?:图片)?(?:\s*([\d:x,]+))?$/i,
  async (e: Message) => {
    try {
      const [, cropParam] = e.msg.match(crop.reg)!
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      if (!cropParam) {
        return await e.reply(
          '请输入正确的裁剪格式 ,如:[0,0,100,100],[100x100],[2:1]',
        )
      }

      const img = Image.fromBytes(image_buffer)
      const image_info = img.info()
      let left: number, top: number, right: number, bottom: number

      if (cropParam.includes(',')) {
        ;[left, top, right, bottom] = cropParam
          .split(',')
          .map((n) => parseInt(n))
      } else if (cropParam.includes('x')) {
        const [width, height] = cropParam.split('x').map((n) => parseInt(n))
        left = 0
        top = 0
        right = width
        bottom = height
      } else if (cropParam.includes(':')) {
        const [widthRatio, heightRatio] = cropParam
          .split(':')
          .map((n) => parseInt(n))
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
        return await e.reply(
          '请输入正确的裁剪格式 ,如:[0,0,100,100],[100x100],[2:1]',
        )
      }
      const result = img.crop(left, top, right, bottom).toBase64()
      await e.reply([segment.image(`base64://${result}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]裁剪图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageCrop',
    priority: 500,
    event: 'message',
  },
)

export const grayscale = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:灰度化)(?:图片)?$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      const reslut = Image.fromBytes(image_buffer).grayscale().toBase64()
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]灰度化图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageGrayscale',
    priority: 500,
    event: 'message',
  },
)

export const mirage = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:幻影坦克)(?:图片)?$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      const image_arr = image && image.length === 2 ? image : null

      if (!image_arr) {
        return await e.reply('未提供图片或图片数量不为2', { reply: true })
      }
      const reslut = Image.fromBytes(image_arr[0].image).mirage(Image.fromBytes(image_arr[1].image)).toBase64()
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]制作幻影坦克图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageMirage',
    priority: 500,
    event: 'message',
  },
)

export const invert = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:反色)(?:图片)?$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      const reslut = Image.fromBytes(image_buffer).invert().toBase64()
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]反色图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageInvert',
    priority: 500,
    event: 'message',
  },
)

export const color_mask = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:颜色滤镜)(?:\s*(\S+))?$/i,
  async (e: Message) => {
    try {
      const [, color] = e.msg.match(color_mask.reg)!
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      if (!color) {
        return await e.reply('请输入正确的颜色格式,如: [255,0,0]')
      }
      const rgbRegex = /^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/i

      if (!rgbRegex.test(color) && !hexColorRegex.test(color)) {
        return await e.reply('颜色格式无效, 请输入标准的RGB格式(如: 255,0,0)')
      }

      let rgb: Rgb
      const rgbMatch = color.match(/^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/)
      if (rgbMatch) {
        rgb = {
          r: parseInt(rgbMatch[1]),
          g: parseInt(rgbMatch[2]),
          b: parseInt(rgbMatch[3]),
        }
      } else {
        const hex = color.replace('#', '')
        rgb = {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        }
      }

      const reslut = Image.fromBytes(image_buffer).colorMask(rgb).toBase64()
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]颜色滤镜图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageColoMask',
    priority: 500,
    event: 'message',
  },
)

export const image_matting = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:图片)?(?:抠图)$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      if (!image) return await e.reply('请发送图片', { reply: true })
      await e.reply('开始处理图片中, 请稍后...')
      const base_url =
        Config.server.url || 'https://skytnt-anime-remove-background.hf.space'
      const client = await GClient.connect(base_url.replace(/\/+$/, ''))
      const result = await client.predict('/rmbg_fn', { img: image[0].image })
      if (Array.isArray(result.data)) {
        const replyMessage = [
          segment.text('============\n'),
          segment.text('原图:\n'),
          segment.image(`base64://${image[0].image.toString('base64')}`),
          segment.text('============\n'),
          segment.text('处理后的图片:\n'),
          segment.image(result.data[0].url),
          segment.image(result.data[1].url),
        ]
        const forWordMsg = common.makeForward(
          replyMessage,
          e.bot.selfId,
          e.bot.selfName,
        )

        await e.bot.sendForwardMsg(e.contact, forWordMsg, {
          news: [{ text: '图片抠图' }],
          prompt: '图片抠图',
          summary: Version.Plugin_Name,
          source: '图片抠图',
        })
      } else {
        throw new Error('无效的响应数据结构')
      }
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]图片抠图失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageMatting',
    priority: 500,
    event: 'message',
  },
)

export const merge_horizontal = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:水平拼接)(?:图片)?$/i,
  async (e: Message) => {
    try {
      const images = await utils.get_image(e, getType)
      if (!images || images.length < 2) {
        return await e.reply('请发送至少两张图片进行合并', { reply: true })
      }
      const imageObjects = images.map((img) => Image.fromBytes(img.image))
      const reslut = imageObjects[0].merge(imageObjects.slice(1), MergeMode.Horizontal).toBase64()
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]水平拼接图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageMergeHorizontal',
    priority: 500,
    event: 'message',
  },
)

export const merge_vertical = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:垂直拼接)(?:图片)?$/i,
  async (e: Message) => {
    try {
      const images = await utils.get_image(e, getType)
      if (!images || images.length < 2) {
        return await e.reply('请发送至少两张图片进行垂直拼接', { reply: true })
      }
      const imageObjects = images.map((img) => Image.fromBytes(img.image))
      const reslut = imageObjects[0].merge(imageObjects.slice(1), MergeMode.Vertical).toBase64()
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]垂直拼接图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:imageMergeVertical',
    priority: 500,
    event: 'message',
  },
)

export const gif_split = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:分解)$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      const reslut = Image.fromBytes(image_buffer).split()

      const images = reslut.map((img) => img.toBase64())
      const zip = new AdmZip()
      images.forEach((img, index) => {
        zip.addFile(`image_${index}.png`, Buffer.from(img, 'base64'))
      })
      const timestamp = Date.now()
      const zipPath = path.join(
        karinPathTemp,
        Version.Plugin_Name,
        'gif',
        `gif分解-${timestamp}.zip`,
      )
      const zipName = path.basename(zipPath)
      zip.writeZip(zipPath)
      try {
        const fileBuffer = await fs.readFile(zipPath)
        const file = `base64://${fileBuffer.toString('base64')}`
        const type = e.isGroup ? 'group' : 'private'
        const id = e.isGroup ? e.groupId : e.userId
        await utils.send_file(
          type,
          Number(e.bot.selfId),
          Number(id),
          file,
          zipName,
        )

        if (await exists(zipPath)) {
          await fs.rm(zipPath)
        }
        if (e.isGroup) {
          setTimeout(
            async () => {
              try {
                let filesList
                const platform = e.bot.adapter.standard
                if (platform === 'onebot11') {
                  filesList = await (e.bot as unknown as any).sendApi!(
                    'get_group_root_files',
                    {
                      group_id: e.groupId,
                    },
                  )
                } else if (platform === 'icqq') {
                  filesList = await (e.bot.super as Client)
                    .pickGroup(Number(e.groupId))
                    .fs.ls()
                }
                let matchedFile
                if (platform === 'icqq') {
                  matchedFile = filesList.find(
                    (file: GfsFileStat | GfsDirStat) => file.name === zipName,
                  )
                } else {
                  const filesArray = Array.isArray(filesList)
                    ? filesList
                    : (filesList.files ?? [])
                  matchedFile = filesArray.find(
                    (file: any) => file.file_name === zipName,
                  )
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
                  await (e.bot as unknown as any).sendApi!(
                    'delete_group_file',
                    {
                      group_id: e.groupId,
                      file_id: fid,
                    },
                  )
                } else if (platform === 'icqq') {
                  await (e.bot.super as Client)
                    .pickGroup(Number(e.groupId))
                    .fs.rm(fid)
                }
              } catch {
                logger.warn('删除群文件失败, 跳过删除群文件')
              }
            },
            10 * 60 * 1000,
          )
        }
      } catch {
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
        ...images.map((img) => segment.image(`base64://${img}`)),
      ]

      const forWordMsg = common.makeForward(
        replyMessage,
        e.bot.selfId,
        e.bot.selfName,
      )

      await e.bot.sendForwardMsg(e.contact, forWordMsg, {
        news: [{ text: 'GIF分解' }],
        prompt: 'GIF分解',
        summary: Version.Plugin_Name,
        source: 'GIF分解',
      })
    } catch (error) {
      logger.error(error)
      await e.reply(`GIF分解失败: ${(error as Error).message}`)
    }
  },
  {
    name: 'karin-plugin-image-tools:gifSplit',
    priority: 500,
    event: 'message',
  },
)

export const gif_merge = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:合并|拼接|合成)(?:\s*(\S+))?$/i,
  async (e: Message) => {
    try {
      const [, duration] = e.msg.match(gif_merge.reg)!
      const images = await utils.get_image(e, getType)
      if (!images || images.length < 2) {
        return await e.reply('请发送至少两张图片进行拼接', { reply: true })
      }
      const imageObjects = images.map((img) => Image.fromBytes(img.image))
      const reslut = imageObjects[0].mergeGif(imageObjects.slice(1), Number(duration)).toBase64(ImageFormat.Gif)
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]gif拼接图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:gifMerge',
    priority: 500,
    event: 'message',
  },
)

export const gif_reverse = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:反转)$/i,
  async (e: Message) => {
    try {
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      const reslut = Image.fromBytes(image_buffer).reverse().toBase64(ImageFormat.Gif)
      await e.reply([segment.image(`base64://${reslut}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]gif反转图片失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:gifReverse',
    priority: 500,
    event: 'message',
  },
)

export const gif_change_duration = karin.command(
  /^#?(?:(?:柠糖)(?:图片操作|imagetools))?(?:gif)?(?:变速|改变帧率)(?:\s*(\d{0,3}\.?\d{1,3}(?:fps|ms|s|x|倍速?|%)?))?$/i,
  async (e: Message) => {
    try {
      const [, param] = e.msg.match(gif_change_duration.reg)!
      const image = await utils.get_image(e, getType)
      const image_buffer = image && image.length > 0 ? image[0].image : null

      if (!image_buffer) {
        return await e.reply('请发送图片', { reply: true })
      }
      if (!param) {
        return await e.reply(
          '请使用正确的倍率格式,如:[0.5x],[50%],[20FPS],[0.05s]',
          { reply: true },
        )
      }
      const img = Image.fromBytes(image_buffer)
      const image_info = img.info()
      if (!image_info.isMultiFrame) {
        return await e.reply('该图片不是动图,无法进行变速操作', { reply: true })
      }
      let duration: number

      const fps_match = param.match(/(\d{0,3}\.?\d{1,3})fps$/i)
      const time_match = param.match(/(\d{0,3}\.?\d{1,3})s$/i)
      const speed_match = param.match(/(\d{0,3}\.?\d{1,3})(?:x|倍速?)$/i)
      const percent_match = param.match(/(\d{0,3}\.?\d{1,3})%$/)

      const base_duration = image_info.averageDuration! / 1000

      if (fps_match) {
        duration = 1 / parseFloat(fps_match[1])
      } else if (time_match) {
        duration = parseFloat(time_match[1])
      } else if (speed_match) {
        duration = base_duration / parseFloat(speed_match[1])
      } else if (percent_match) {
        duration = base_duration / (parseFloat(percent_match[1]) / 100)
      } else {
        return await e.reply(
          '请使用正确的倍率格式,如:[0.5x],[50%],[20FPS],[0.05s]',
          { reply: true },
        )
      }

      if (duration < 0.02) {
        return await e.reply([
          segment.text('帧间隔必须大于 0.02 s (小于等于 50 FPS),\n'),
          segment.text('超过该限制可能会导致 GIF 显示速度不正常.\n'),
          segment.text(
            `当前帧间隔为 ${duration.toFixed(3)} s (${(1 / duration).toFixed(1)} FPS)`,
          ),
        ])
      }

      console.log(duration)
      const reslut = img.changeDuration(duration)
      await e.reply([segment.image(`base64://${reslut.toBase64(ImageFormat.Gif)}`)])
    } catch (error) {
      logger.error(error)
      await e.reply(
        `[${Version.Plugin_Name}]GIF变速失败: ${(error as Error).message}`,
      )
    }
  },
  {
    name: 'karin-plugin-image-tools:gifChangeDuration',
    priority: 500,
    event: 'message',
  },
)
