export interface AvatarInfoType {
  /** 用户id */
  userId: string
  /** 头像 */
  avatar: string
}

export interface ImageInfoType<D> {
  /** 用户id */
  userId: string
  /** 图片 */
  image: D extends 'buffer' ? Buffer : string
}
