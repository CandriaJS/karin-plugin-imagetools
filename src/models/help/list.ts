import { HelpType } from '@/types'
type HelpListType = HelpType['helpList']

export const helpList:HelpListType = [
  {
    group: '[]内为必填项,{}内为可选项, #均为可选'
  },
  {
    group: '图片操作命令',
    list: [
      {
        icon: 71,
        title: '#图片信息',
        desc: '获取图片信息'
      },
      {
        icon: 157,
        title: '#水平翻转',
        desc: '水平翻转图片'
      },
      {
        icon: 158,
        title: '#垂直翻转',
        desc: '垂直翻转图片'
      },
      {
        icon: 158,
        title: '#灰度化',
        desc: '灰度化图片'
      },
      {
        icon: 160,
        title: '#幻影坦克',
        desc: '对两张图片进行幻影坦克处理'
      },
      {
        icon: 158,
        title: '#抠图',
        desc: '图片抠图'
      },
      {
        icon: 158,
        title: '#反色',
        desc: '反色图片'
      },
      {
        icon: 158,
        title: '#颜色滤镜#xxx',
        desc: '颜色滤镜图片'
      },
      {
        icon: 159,
        title: '#旋转 xx',
        desc: '旋转图片xx度'
      },
      {
        icon: 160,
        title: '#缩放 xx',
        desc: '缩放图片xx度'
      },
      {
        icon: 161,
        title: '#裁剪 xx,xx,xx,xx',
        desc: '裁剪图片xx度'
      },
      {
        icon: 132,
        title: '#水平拼接',
        desc: '水平拼接图片，需多张图片'
      },
      {
        icon: 132,
        title: '#垂直拼接',
        desc: '垂直拼接图片，需多张图片'
      },
      {
        icon: 123,
        title: '#gif分解',
        desc: '分解gif图片'
      },
      {
        icon: 123,
        title: '#gif合成',
        desc: '合成gif图片，需多张图片'
      },
      {
        icon: 123,
        title: '#gif变速xxxS',
        desc: '变速gif图片'
      }
    ]
  },
  {
    group: '管理命令，仅主人可用',
    auth: 'master',
    list: [
      {
        icon: 95,
        title: '#柠糖图片操作(插件)更新',
        desc: '更新插件本体'
      }
    ]
  }
]
