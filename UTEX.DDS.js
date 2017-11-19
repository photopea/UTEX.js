	
	if(UTEX==null) UTEX = {};
	
	UTEX.DDS = { 
		C : {
			DDSD_CAPS   : 0x1,  // always	// header flags
			DDSD_HEIGHT	: 0x2,  // always
			DDSD_WIDTH	: 0x4,  // always
			DDSD_PITCH  : 0x8,
			DDSD_PIXELFORMAT : 0x1000,	// always
			DDSD_MIPMAPCOUNT : 0x20000,
			DDSD_LINEARSIZE  : 0x80000,
			DDSD_DEPTH : 0x800000,
			
			DDPF_ALPHAPIXELS : 0x1,	// pixel format flags
			DDPF_ALPHA  : 0x2,
			DDPF_FOURCC : 0x4,
			DDPF_RGB    : 0x40,
			DDPF_YUV    : 0x200,
			DDPF_LUMINANCE : 0x20000,
			
			DDSCAPS_COMPLEX	: 0x8,
			DDSCAPS_MIPMAP  : 0x400000,
			DDSCAPS_TEXTURE : 0x1000
		},
	
		decode : function(buff)
		{
			var data = new Uint8Array(buff), offset = 0;
			var mgck = UTEX.U.readASCII(data, offset, 4);  offset+=4;
			
			var head, pf, hdr10, C = UTEX.DDS.C;
			
			head = UTEX.DDS.readHeader(data, offset);  offset += 124;
			pf = head.pixFormat;
			if( (pf.flags&C.DDPF_FOURCC) && pf.fourCC=="DX10") {  hdr10 = UTEX.DDS.readHeader10(data, offset);  offset+=20;  }
			//console.log(head, pf);
			
			var w = head.width, h = head.height, out = [];
			var fmt = pf.fourCC, bc  = pf.bitCount;
			
			//var time = Date.now();
			var mcnt = Math.max(1, head.mmcount);
			for(var it=0; it<mcnt; it++)
			{
				var img = new Uint8Array(w * h * 4);
				if(false) {}
				else if(fmt=="DXT1") offset=UTEX.readBC1(data, offset, img, w, h);
				else if(fmt=="DXT3") offset=UTEX.readBC2(data, offset, img, w, h);
				else if(fmt=="DXT5") offset=UTEX.readBC3(data, offset, img, w, h);
				else if(fmt=="DX10") offset=UTEX.readBC7(data, offset, img, w, h);
				else if(fmt=="ATC ") offset=UTEX.readATC(data, offset, img, w, h);
				else if(fmt=="ATCA") offset=UTEX.readATA(data, offset, img, w, h);
				else if(fmt=="ATCI") offset=UTEX.readATA(data, offset, img, w, h);
				else if((pf.flags&C.DDPF_ALPHAPIXELS) && (pf.flags&C.DDPF_RGB)) {
					if     (bc==32) {
						for(var i=0; i<img.length; i++) img[i] = data[offset+i];
						offset+=img.length;
					}
					else if(bc==16) {
						for(var i=0; i<img.length; i+=4) {
							var clr = (data[offset+(i>>1)+1]<<8) | data[offset+(i>>1)];
							img[i+0] = 255*(clr&pf.RMask)/pf.RMask;
							img[i+1] = 255*(clr&pf.GMask)/pf.GMask;
							img[i+2] = 255*(clr&pf.BMask)/pf.BMask;
							img[i+3] = 255*(clr&pf.AMask)/pf.AMask;
						}
						offset+=(img.length>>1);
					}
					else throw ("unknown bit count "+bc);
				}
				else if((pf.flags&C.DDPF_ALPHA) || (pf.flags&C.DDPF_ALPHAPIXELS) || (pf.flags&C.DDPF_LUMINANCE)) {
					if(bc==8)  {
						for(var i=0; i<img.length; i+=4) img[i+3] = data[offset+(i>>2)];
						offset+=(img.length>>2)
					}
					else throw "unknown bit count "+bc;
				}
				else {
					console.log("unknown texture format, head flags: ", head.flags.toString(2), "pixelFormat flags: ", pf.flags.toString(2));
					throw "e";
				}
				out.push({width:w, height:h, image:img.buffer});
				w = (w>>1);  h = (h>>1);
			}
			//console.log(Date.now()-time);  throw "e";
			return out; //out.slice(0,1);
		},
	
		encode : function(img, w, h)
		{
			var img = new Uint8Array(img);
			var aAnd = 255;
			for(var i=3; i<img.length; i+=4) aAnd &= img[i];
			var gotAlpha = aAnd<250;
			
			var data = new Uint8Array(124+(w*h*2)), offset = 0;
			UTEX.U.writeASCII(data, offset, "DDS ");                offset+=  4;
			UTEX.DDS.writeHeader(data, w, h, gotAlpha, offset);  offset+=124;
			
			var mcnt = 0;
			while(w*h!=0) {
				if(gotAlpha) offset = UTEX.writeBC3(img, w, h, data, offset);
				else         offset = UTEX.writeBC1(img, w, h, data, offset);
				img = UTEX.mipmapB(img, w, h);
				w = (w>>1);  h = (h>>1);
				mcnt++;
			}
			data[28] = mcnt;
			
			return data.buffer.slice(0, offset);
		},
	
		readHeader : function(data, offset)
		{
			var hd = {}, rUi = UTEX.U.readUintLE;
			offset+=4;	// size = 124
			hd.flags    = rUi(data, offset);  offset+=4;
			hd.height   = rUi(data, offset);  offset+=4;
			hd.width    = rUi(data, offset);  offset+=4;
			hd.pitch    = rUi(data, offset);  offset+=4;
			hd.depth    = rUi(data, offset);  offset+=4;
			hd.mmcount  = rUi(data, offset);  offset+=4;
			offset+=11*4;	// reserved, zeros
			hd.pixFormat= UTEX.DDS.readPixFormat(data, offset);  offset+=32;
			hd.caps     = rUi(data, offset);  offset+=4;
			hd.caps2    = rUi(data, offset);  offset+=4;
			hd.caps3    = rUi(data, offset);  offset+=4;
			hd.caps4    = rUi(data, offset);  offset+=4;
			offset+=4;  // reserved, zeros
			return hd;
		},
		writeHeader : function(data, w,h, gotAlpha, offset)
		{
			var wUi = UTEX.U.writeUintLE, C = UTEX.DDS.C;
			var flgs = C.DDSD_CAPS | C.DDSD_HEIGHT | C.DDSD_WIDTH | C.DDSD_PIXELFORMAT;
			flgs |= C.DDSD_MIPMAPCOUNT | C.DDSD_LINEARSIZE;
			
			var caps = C.DDSCAPS_COMPLEX | C.DDSCAPS_MIPMAP | C.DDSCAPS_TEXTURE;
			var pitch = ((w*h)>>1)*(gotAlpha?2:1), depth = gotAlpha ? 1 : 0;
			
			wUi(data, offset,    124);  offset+=4;
			wUi(data, offset,   flgs);  offset+=4;  // flags
			wUi(data, offset,      h);  offset+=4;
			wUi(data, offset,      w);  offset+=4;
			wUi(data, offset,  pitch);  offset+=4;
			wUi(data, offset,  depth);  offset+=4;
			wUi(data, offset,     10);  offset+=4;
			offset+=11*4;
			UTEX.DDS.writePixFormat(data, gotAlpha, offset);  offset+=32;
			wUi(data, offset,   caps);  offset+=4;  // caps
			offset += 4*4;
		},
	
		readPixFormat : function(data, offset) 
		{
			var pf = {}, rUi = UTEX.U.readUintLE;
			offset+=4;  // size = 32
			pf.flags    = rUi(data, offset);  offset+=4;
			pf.fourCC   = UTEX.U.readASCII(data, offset,4);  offset+=4;
			pf.bitCount = rUi(data, offset);  offset+=4;
			pf.RMask    = rUi(data, offset);  offset+=4;
			pf.GMask    = rUi(data, offset);  offset+=4;
			pf.BMask    = rUi(data, offset);  offset+=4;
			pf.AMask    = rUi(data, offset);  offset+=4;
			return pf;
		},
		writePixFormat : function(data, gotAlpha, offset)
		{
			var wUi = UTEX.U.writeUintLE, C = UTEX.DDS.C;
			var flgs = C.DDPF_FOURCC;
			
			wUi(data, offset,   32); offset+=4;
			wUi(data, offset, flgs); offset+=4;
			UTEX.U.writeASCII(data, offset, gotAlpha?"DXT5":"DXT1");  offset+=4;
			offset+=5*4;
		},
	
		readHeader10 : function(data, offset)
		{
			var hd = {}, rUi = UTEX.U.readUintLE;
			
			hd.format   = rUi(data, offset);  offset+=4;
			hd.dimension= rUi(data, offset);  offset+=4;
			hd.miscFlags= rUi(data, offset);  offset+=4;
			hd.arraySize= rUi(data, offset);  offset+=4;
			hd.miscFlags2=rUi(data, offset);  offset+=4;
			
			return hd;
		}
	}
	
	UTEX.PVR = {
		decode : function(buff)
		{
			var data = new Uint8Array(buff), offset = 0;
			var head = UTEX.PVR.readHeader(data, offset);  offset+=52;
			//var ooff = offset;
			//console.log(PUtils.readByteArray(data, offset, 10))
			offset += head.mdsize;
			
			console.log(head);
			
			var w = head.width, h = head.height;
			var img = new Uint8Array(h*w*4);
			
			var pf = head.pf0;
			if(pf==0) {
				for(var y=0; y<h; y++)
					for(var x=0; x<w; x++)
					{
						var i = y*w+x, qi = i<<2, bi = i<<1;
						
						//img[qi+0]=((data[offset+(bi>>3)]>>(bi&7))&3)*85;
						img[qi+3]=255;
					}
			}
			else console.log("Unknown pixel format: "+pf);
			
			return [{width:w, height:h, image:img.buffer}]
		},
		readHeader : function(data, offset)
		{
			var hd = {}, rUi = UTEX.U.readUintLE;
			hd.version  = rUi(data, offset);  offset+=4;
			hd.flags    = rUi(data, offset);  offset+=4;
			hd.pf0      = rUi(data, offset);  offset+=4;
			hd.pf1      = rUi(data, offset);  offset+=4;
			hd.cspace   = rUi(data, offset);  offset+=4;
			hd.ctype    = rUi(data, offset);  offset+=4;
			hd.height   = rUi(data, offset);  offset+=4;
			hd.width    = rUi(data, offset);  offset+=4;
			hd.sfnum     = rUi(data, offset);  offset+=4;
			hd.fcnum     = rUi(data, offset);  offset+=4;
			hd.mmcount  = rUi(data, offset);  offset+=4;
			hd.mdsize   = rUi(data, offset);  offset+=4;
			return hd;
		}
	}