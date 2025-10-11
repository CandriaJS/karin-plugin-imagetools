import karin, {base64, buffer, Message, MessageResponse} from 'node-karin'

import {ImageInfoType} from '@/types'

import Request from './request'

/**
 * 异步判断是否在海外环境
 * @returns 如果在海外环境返回 true，否则返回 false
 * @throws 如果获取 IP 位置失败，则抛出异常
 */
export const isAbroad = async (): Promise<boolean> => {
    const urls = [
        'https://blog.cloudflare.com/cdn-cgi/trace',
        'https://developers.cloudflare.com/cdn-cgi/trace',
        'https://hostinger.com/cdn-cgi/trace',
        'https://ahrefs.com/cdn-cgi/trace'
    ]

    try {
        const responses = await Promise.all(
            urls.map((url) => Request.get(url, null, null, 'text'))
        )
        const traceTexts = responses.map((res) => res.data).filter(Boolean)
        const traceLines = traceTexts
            .flatMap((text: string) =>
                text.split('\n').filter((line: string) => line)
            )
            .map((line) => line.split('='))

        const traceMap = Object.fromEntries(traceLines)
        return traceMap.loc !== 'CN'
    } catch (error) {
        throw new Error(`获取 IP 所在地区出错: ${(error as Error).message}`)
    }
}

/**
 * 获取图片
 * @param e 消息事件
 * @param type 返回类型 url 或 base64
 * @returns 图片数组信息
 */
export async function get_image<T extends 'url' | 'base64' | 'buffer' = 'url'>(
    e: Message,
    type: T = 'url' as T
): Promise<Array<ImageInfoType<T>>> {
    const imagesInMessage = e.elements
        .filter((m) => m.type === 'image')
        .map((img) => ({
            userId: e.sender.userId,
            image: img.file
        }))

    const tasks: Promise<ImageInfoType<T>>[] = []

    let quotedImages: Array<ImageInfoType<T>> = []
    let source: MessageResponse | null = null
    /**
     * 获取引用消息的内容
     */
    const replyId: string | null = e.replyId ?? e.elements.find((m) => m.type === 'reply')?.messageId ?? null

    if (replyId) {
        source = (await e.bot.getMsg(e.contact, replyId)) ?? null
    }

    /**
     * 提取引用消息中的图片
     */
    if (source) {
        quotedImages = source.elements
            .filter((m) => m.type === 'image')
            .map((img) => ({
                userId: source.sender.userId,
                image: img.file
            })) as Array<ImageInfoType<T>>
    }

    /**
     * 处理引用消息中的图片
     */
    if (quotedImages.length > 0) {
        const quotedImagesPromises = quotedImages.map(async (item) => {
            switch (type) {
                case 'buffer':
                    return {
                        userId: item.userId,
                        image: await buffer(item.image)
                    } as ImageInfoType<T>
                case 'base64':
                    return {
                        userId: item.userId,
                        image: await base64(item.image)
                    } as ImageInfoType<T>
                case 'url':
                default:
                    return {
                        userId: item.userId,
                        image: item.image.toString()
                    } as ImageInfoType<T>
            }
        })
        tasks.push(...quotedImagesPromises)
    }

    /**
     * 处理消息中的图片
     */
    if (imagesInMessage.length > 0) {
        const imagePromises = imagesInMessage.map(async (item) => {
            switch (type) {
                case 'buffer':
                    return {
                        userId: item.userId,
                        image: await buffer(item.image)
                    } as ImageInfoType<T>
                case 'base64':
                    return {
                        userId: item.userId,
                        image: await base64(item.image)
                    } as ImageInfoType<T>
                case 'url':
                default:
                    return {
                        userId: item.userId,
                        image: item.image.toString()
                    } as ImageInfoType<T>
            }
        })
        tasks.push(...imagePromises)
    }

    const results = await Promise.allSettled(tasks)
    return results
        .filter(
            (res): res is PromiseFulfilledResult<ImageInfoType<T>> =>
                res.status === 'fulfilled' && Boolean(res.value)
        )
        .map((res) => res.value)
}

/**
 * 向指定的群或好友发送文件
 * @param type 发送的类型
 * - group 为群
 * - private 为好友
 * @param botId 机器人的id
 * @param id 群或好友的id
 * @param file 文件路径
 * @param name 文件名称
 * @returns 发送结果
 */
export async function send_file(type: 'group' | 'private', botId: number, id: number, file: string, name: string) {
    try {
        const bot = karin.getBot(String(botId))
        let Contact
        if (type === 'group') {
            Contact = karin.contactGroup(String(id))
        } else if (type === 'private') {
            Contact = karin.contactFriend(String(id))
        } else {
            throw new Error('type 必须为 group 或 private')
        }
        return await bot?.uploadFile(Contact, file, name)
    } catch (error) {
        throw new Error(`向${type === 'group' ? '群' : '好友'} ${id} 发送文件失败: ${(error as Error).message}`)
    }
}
