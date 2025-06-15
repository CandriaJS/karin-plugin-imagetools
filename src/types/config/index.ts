import { otherType } from '@/types/config/other'
import { serverType } from '@/types/config/server'

export interface ConfigType {
  /** 服务器配置文件 */
  server: serverType
  /** 其他配置文件 */
  other: otherType
}
