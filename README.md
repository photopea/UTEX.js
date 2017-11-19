# UTEX.js
A fast, tiny tool for working with compressed textures (DDS etc.). It is used in [Photopea.com](//www.Photopea.com). Try to open your compressed texture in Photopea to see how it works. It can compress and decompress following formats:

- Decompress: **BC1, BC2, BC3, BC7** (a.k.a. DXT1, DXT3, DXT5, DX10) and **ATC** (ATI Texture Compression)
- Compress: **BC1, BC3** (DXT1, DXT5)

The decompressed image (output of decompression, input to compression) is always "RGBA8".

## Decoder

All functions have the same interface.

#### `UTEX.readXYZ(data, offset, img, w, h)`
* `data`: Uint8Array with a compressed file
* `offset`: where in "data" is the start of the image
* `img`: the output array (Uint8Array for RGBA8), which will be filled from the beginning
* `w, h`: the width and the height of an output image (usually a multiple of 4)

Actual functions are: 
```js
UTEX.readBC1(...)
UTEX.readBC2(...)
UTEX.readBC3(...)
UTEX.readBC7(...)
UTEX.readATC(...)
```

## Encoder

All functions have the same interface.

#### `UTEX.writeXYZ(img, w, h, data, offset)`
* `img`: the input image (Uint8Array of RGBA8)
* `w, h`: the width and the height of the image (usually a multiple of 4)
* `data`: Uint8Array to write the data into
* `offset`: where in "data" should the image start

Actual functions are: 
```js
UTEX.writeBC1(...)
UTEX.writeBC3(...)
```
# UTEX.DDS.js

This tool can parse entire DDS files (header + compressed texture). Inside, it calls the appropriate UTEX.readXYZ function according to the header.

#### `UTEX.DDS.decode(buff)`
* `buff`: ArrayBuffer containing the binary DDS file
* returns an array of images (mipmap levels, usually 1). An image is an object with:
* * `width`: the width of the image
* * `height`: the height of the image
* * `image`: ArrayBuffer with RGBA8 content

#### `UTEX.DDS.encode(img, w, h)`
* `img`: ArrayBuffer containing the RGBA image
* `w, h`: the width and the height of the image (usually a multiple of 4)
* returns an ArrayBuffer of the DDS file

This DDS encoder uses BC1 when all Alpha values are 255, and BC3 otherwise. It also creates all Mipmap levels.

