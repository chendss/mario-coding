const e = set => document.querySelector(set)
const es = set => Array.from(document.querySelectorAll(set))

const log = console.log

const ajax = url => {
  return new Promise(resolve => {
    let r = new XMLHttpRequest()
    const method = 'GET'
    r.open(method, url, true)
    r.responseType = 'arraybuffer'
    r.onreadystatechange = event => {
      if (r.readyState === 4) {
        resolve(r.response)
      }
    }
    r.send()
  })
}

const sleep = (time = 10) => {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

const config = {
  /** 偏移量,可以整除4 */
  offset: 32784, // 上一步已经找到图片的地址了
  /** 存储的bytes */
  bytes: []
}

const colors = [
  // 颜色是人定的 这个素材不包含颜色信息
  'white',
  '#FE1000',
  '#FFB010',
  '#AA3030'
]

const drawBlock = async (options, isSleep = false) => {
  const { context, data, x, y, pixeWidth, blockSize } = options
  const [w, h] = [pixeWidth * 1, pixeWidth * 1] // 一个像素的宽高 放大后
  for (let i = 0; i < blockSize; i++) {
    let p1 = data[i]
    let p2 = data[i + 8]
    /** 
     * 8个bits 一行
     * 在j循环 每次画一个像素点
     */
    for (let j = 0; j < 8; j++) {
      /** 二进制向右移动  */
      const c1 = (p1 >> (7 - j)) & 1
      let c2 = (p2 >> (7 - j)) & 1
      let pixel = (c2 << 1) + c1
      const color = colors[pixel]
      let px = x + j * w
      let py = y + i * h
      context.fillStyle = color
      context.fillRect(px, py, w, h)
    }
    if (isSleep === true) {
      await sleep()
    }
  }
}

/**
 * 画一个完整的图片
 *
 */
const drawSprite = async function (isSleep = true, offset_ = null) {
  console.log('开始画马里奥')
  const bytes = config.bytes.slice(offset_ || config.offset)
  const canvas = e('#id-canvas-big')
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, 160, 320)
  /** 一个格子8个像素 */
  const pixelsBlock = 8
  const pixeWidth = 10
  let offset = 0
  const blockSize = pixelsBlock * pixeWidth
  // 马里奥的宽度是4个格子 高度是2个
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const x = blockSize * j
      const y = blockSize * i
      const data = bytes.slice(offset)
      const options = {
        x, y, pixeWidth, context, data, blockSize
      }
      await drawBlock(options, isSleep)
      offset += 16 // 一个字节要加16
    }
  }
  return offset
}

/**
 * 画一页8*8的图块
 *
 */
const drawNes = async () => {
  log('绘图开始')
  const bytes = config.bytes
  const canvas = e('#id-canvas')
  const context = canvas.getContext('2d')
  /** 容器宽度 */
  const containerSize = 8
  /** 一个图块8像素 */
  const blockSize = 8
  /** 因为一个像素占用2个bit 所以一个像素在二进制中占8位 */
  const pixelSize = 8
  /** 一个像素的宽高 - 放大用 因为一个像素看不清 */
  const pixeWidth = 10
  /** 一个图块16个像素 */
  const numberOfBlock = 16
  for (let i = 0; i < containerSize; i++) {
    for (let j = 0; j < containerSize; j++) {
      // 计算bytes
      let x = j * pixelSize * pixeWidth
      let y = i * pixelSize * pixeWidth
      /** 计算出正在画第几个block */
      const index = config.offset + (i * 8 + j) * numberOfBlock
      const options = {
        x,
        y,
        context,
        pixeWidth,
        blockSize,
        /** 这样裁剪使得 drawBlock 可以保持索引从0开始计算 */
        data: bytes.slice(index),
      }
      await drawBlock(options)
    }
  }
  await drawSprite(false)
}

const actions = {
  change_offset (offset) {
    config.offset += offset
    drawNes(config.bytes)
  },
  setBytes (bytes) {
    config.bytes = bytes
  }
}

const runMario = function () {
  let offset = config.offset
  let step = 0
  setInterval(async () => {
    offset += await drawSprite(false, offset)
    step = (step + 1) % 4
    if (step === 3) {
      offset = config.offset
    }
  }, 200)
}

const slowDrawMario = function () {
  drawSprite()
}

const bindEvent = () => {
  const btns = es('button')
  const runBtn = e('#id-run')
  const drawBtn = e('#id-draw')
  btns.forEach(btn => {
    btn.addEventListener('click', (event) => {
      const dataset = event.target.dataset
      const action = dataset.action
      const offset = Number(dataset.offset)
      actions[action] && actions[action](offset)
      const h3 = e('h3')
      h3.innerHTML = config.offset
    })
  })
  runBtn.addEventListener('click', runMario)
  drawBtn.addEventListener('click', slowDrawMario)
}

const _main = async function () {
  bindEvent()
  const res = await ajax('../resources/game.nes')
  const bytes = new Uint8Array(res)
  actions.setBytes(bytes)
  log('图像数据', bytes)
  drawNes()
  const h3 = e('h3')
  h3.innerHTML = config.offset
}

_main()