const fs = require('fs')
const { chunk } = require('lodash')


/**
 * 解析图片二进制数据
 * 
 * 图片信息是按 开始信息 数据信息 结束信息
 * 开始信息有8位 包含数据信息的长度 数据类型
 * 数据信息按[开始信息]的前4位解析结果决定
 * 结束信息有4位 用来给程序校验 CRC32
 * @param {*} keys
 * @returns
 */
const parseCodes = function (keys, dict) {
  let cursor = 0 // 表示解析的游标
  let size = 0 // 表示数据信息长度
  let describe = []
  let infoList = []
  let checkInfo = []
  const codes = [] // 存储解析好的数据
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const code = dict[key]
    if (i < 8 + cursor) {
      describe.push(code.toString(2))
      if (i < (4 + cursor)) {
        // 开始信息的头四位表示 [数据信息] 的长度
        size += code
      }
    } else if (i < (8 + size + cursor)) {
      infoList.push(code.toString(2))
    } else if (i < (8 + size + 4 + cursor)) {
      checkInfo.push(code.toString(2))
    } else {
      // 一组数据解析完成
      cursor = i
      codes.push({
        describe,
        data: infoList,
        checkData: checkInfo
      })
      describe = []
      infoList = []
      checkInfo = []
      size = 0
    }
  }
  return codes
}

fs.readFile('./images/demo.png', (err, data) => {
  const dict = new Uint8Array(data.buffer)
  const keys = Object.keys(dict)

  const head = keys.splice(0, 8) // 取出前8位并且删除
  const headCode = head.map(i => dict[i].toString(2).padStart())
  const codes = [{
    describe: '文件签名',
    data: headCode
  }] // 取出魔数

  const baseCodes = chunk(keys, 4).map(arr => arr.map(key => dict[key].toString(2)))

  codes.push(...parseCodes(keys, dict))
  fs.writeFileSync('./codes.json', JSON.stringify(baseCodes), { encoding: 'utf8' })
  fs.writeFileSync('./parseData.json', JSON.stringify(codes), { encoding: 'utf8' })
})