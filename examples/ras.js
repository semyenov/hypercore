const RandomAccessStorage = require("random-access-storage")
const ras = new RandomAccessStorage('./test');

ras.write(0, new Buffer.from('test', 'binary'), (err) => {
  ras.stat((err, stats) => {
    console.log(stats)
  })
})