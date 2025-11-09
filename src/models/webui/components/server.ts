import { components } from 'node-karin'

import { Config } from '@/common'

export const serverComponents = () => [
  components.accordion.create('server', {
    label: '服务设置',
    children: [
      components.accordion.createItem('webui:server', {
        title: '服务设置',
        subtitle: '用于和服务相关的内容，如设置服务地址等',
        children: [
          components.input.create('url', {
            label: '抠图服务地址',
            isRequired: false,
            description: 'Anime Background Remover API 地址',
            defaultValue: Config.server.url,
            rules: [
              {
                regex:
                  /^https?:\/\/((?:\d{1,3}\.){3}\d{1,3}|\w+\.\w{2,})(:\d{1,5})?$/i,
                error: '请输入有效的URL地址',
              },
            ],
          }),
        ],
      }),
    ],
  }),
]
