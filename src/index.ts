import { Context, Schema } from 'koishi'
import util from 'util'

export const name = 'friendlink'
export const inject = ['database']

export const usage=`

# 添加友情链接方式
  ## 1)addlink <name> <url>
  
    - 正确的参数[addlink name url]

    - 例子: addlink 友链名称 友链地址

  ## 2)回复分享链接

    - 点击要添加友链机器人右上角分享

    - 复制链接

    - @机器人 粘贴链接

`

export interface Config {
  length: number
  MDid: string
  key1: string
  key2: string
  key3: string
}

declare module 'koishi' {
  export interface Tables {
    friendlinks: Links
  }
}

export interface Links {
  id: number
  name: string
  url: string
}

export const Config: Schema<Config> = Schema.object({
  length: Schema.number().default(2).description('每行显示的个数'),
  MDid: Schema.string().required().description('MDid,qq开发者平台获取'),
  key1: Schema.string().default('text1'),
  key2: Schema.string().default('text2'),
  key3: Schema.string().default('text3'),
})



export function apply(ctx: Context, config: Config) {
  ctx.database.extend('friendlinks', {
    id: 'unsigned',
    name: 'string',
    url: 'string'
  }, {
    autoInc: true,
  })

  ctx.middleware(async (session, next) => {
    const { content, type} = session
    if (!content.includes('点击链接了解机器人详情')) return next()
    const link=content.match(/https:\/\/\S+/)
    const name=content.match(/【(.*?)】/)
    session.execute(`addlink ${name[1]} ${link[0]}`)
    
  })

  ctx.command('addlink <name> <url>', '添加友链', { authority: 4 })
    .action(async ({ session }, name, url) => {
      if (!name || !url) return '参数不足,正确的参数[addlink name url]'
      const { id } = await ctx.database.create('friendlinks', { name, url })
      return `已添加友链：${name}，id: ${id}`
    })


  ctx.command('deletelink <id>', '删除友链', { authority: 4 })
    .action(async ({ session }, id) => {
      const cid = parseInt(id)
      const link = (await ctx.database.get('friendlinks', { id: cid }))[0]
      if (!link) return '未找到该友链'
      await ctx.database.remove('friendlinks', { id: cid })
      return `已删除友链：${link.name}`
    })
  ctx.command('friendlink', '查看友链')
    .action(async ({ session }) => {
      const links = await ctx.database.select('friendlinks')
        .execute()
      const row = keyboardItem(links.length, links, session.userId)
      console.log(util.inspect(row, { depth: null }))
      await session.bot.internal.sendMessage(session.channelId, {
        content: "111",
        msg_type: 2,
        markdown: {
          custom_template_id: config.MDid,
          params: [
            {
              key: config.key1,
              values: ["友情链接"]
            }
          ]
        },
        keyboard: {
          content: {
            "rows": row
          },
        },
        msg_id: session.messageId,
        timestamp: session.timestamp,
        msg_seq: Math.floor(Math.random() * 1000000),
      })

    })

  function keyboardItem(length: number, links: Links[], serId) {
    let buttonList: any[] = []
    let rowList: any[] = []
    // const line=length%5
    for (let i = 0; i < length; i++) {
      buttonList.push(urlbutton(2, links[i].name, links[i].url, serId, links[i].id))
      const line = length % config.length
      const last = length - line
      if (buttonList.length == config.length) {
        rowList.push({
          "buttons": buttonList
        })
        buttonList = []
      }
      if (i>=last) {
        rowList.push({
          "buttons": buttonList
        })
        buttonList = []
      }
    }
    return rowList
  }
  function urlbutton(pt: number, a: string, b: string, d: string, c: number, enter = true) {
    return {
      "id": String(c),
      "render_data": {
        "label": a,
        "visited_label":a
      },
      "action": {
        "type": 0,
        "permission": {
          "type": pt,
          "specify_role_ids": [d]
        },
        "unsupport_tips": "兼容文本",
        "data": b,
      }
    }
  }
}
