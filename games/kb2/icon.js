{ bg: ['#8ad98a', '#174d2b'], defs: lg('kbh0', '#8ccaff', '#1d56bd', 1, 1) + lg('kbh1', '#ff8466', '#ad2216', 1, 1) + lg('kbh2', '#9cec8c', '#21883a', 1, 1) + rg('kbsk', '#ffe8d0', '#eeaa82', .4, .35, .8) + lg('kbbw', '#ffffff', '#d2d6e0') + lg('kbbg', '#e8a066', '#99582a') + rg('kbno', '#ffc0a6', '#de7458', .4, .3, .8) + lg('kbhl', '#79d653', '#2a7428') + lg('kbcap', '#ff7a5a', '#c0261c') + lg('kbbr', '#ffe070', '#d99a18'),
      body: (() => {
        const head = (x, y, s, k) => {
          const beard = k === 1 ? 'url(#kbbg)' : 'url(#kbbw)';
          let g = `<g transform="translate(${x} ${y}) scale(${s})">`;
          if (k === 2) g += '<path d="M-58-10C-86 30-80 86-62 112M58-10C86 30 80 86 62 112" stroke="url(#kbbr)" stroke-width="26" stroke-linecap="round" fill="none"/><circle cx="-62" cy="116" r="12" fill="#ff5a8a"/><circle cx="62" cy="116" r="12" fill="#ff5a8a"/>';
          if (k !== 2) g += `<path d="M-64-4C-68 ${k === 1 ? 92 : 74}-24 ${k === 1 ? 128 : 112} 0 ${k === 1 ? 136 : 120} 24 ${k === 1 ? 128 : 112} 68 ${k === 1 ? 92 : 74} 64-4 40 20 22 26 0 26-22 26-40 20-64-4Z" fill="${beard}"/>`;
          g += '<circle cx="0" cy="-6" r="62" fill="url(#kbsk)"/>';
          if (k !== 2) g += `<path d="M-38 26C-22 8-6 12 0 22 6 12 22 8 38 26 22 36 6 32 0 28-6 32-22 36-38 26Z" fill="${beard}"/>`;
          else g += '<path d="M-16 34Q0 46 16 34" stroke="#b5485a" stroke-width="5" fill="none" stroke-linecap="round"/>';
          g += '<circle cx="-34" cy="12" r="11" fill="#ff8a8a" opacity=".45"/><circle cx="34" cy="12" r="11" fill="#ff8a8a" opacity=".45"/>';
          g += '<ellipse cx="-22" cy="-12" rx="9" ry="11" fill="#2a1a12"/><ellipse cx="22" cy="-12" rx="9" ry="11" fill="#2a1a12"/><circle cx="-19" cy="-16" r="3.5" fill="#fff"/><circle cx="25" cy="-16" r="3.5" fill="#fff"/>';
          g += `<path d="M-34-30Q-22-${k === 1 ? 32 : 38}-10-32M10-32Q22-${k === 1 ? 32 : 38} 34-30" stroke="${k === 1 ? '#6a3a1a' : k === 2 ? '#b0801a' : '#c8ccd6'}" stroke-width="${k === 1 ? 7 : 5}" stroke-linecap="round" fill="none"/>`;
          g += '<circle cx="0" cy="10" r="20" fill="url(#kbno)"/><circle cx="-6" cy="3" r="6" fill="#fff" opacity=".55"/>';
          g += `<path d="M-74-28C-62-92-22-150 ${k === 1 ? 40 : 26}-${k === 1 ? 196 : 176}C${k === 1 ? 26 : 16}-148 40-96 74-28Z" fill="url(#kbh${k})"/>`;
          g += `<path d="M-50-40C-40-90-14-130 ${k === 1 ? 26 : 14}-160C-2-120-20-84-30-40Z" fill="#fff" opacity=".2"/>`;
          g += '<path d="M-80-32C-30-12 30-12 80-32L82-12C30 6-30 6-82-12Z" fill="#000" opacity=".28"/>';
          if (k === 2) g += '<g transform="translate(46 -36)"><circle r="9" cx="0" cy="-9" fill="#fff"/><circle r="9" cx="9" cy="0" fill="#fff"/><circle r="9" cx="0" cy="9" fill="#fff"/><circle r="9" cx="-9" cy="0" fill="#fff"/><circle r="7" fill="#ffcf3a"/></g>';
          if (k === 0) g += '<path d="M-60-56C-80-90-74-120-56-132-58-104-50-80-46-58Z" fill="#ffd34a"/>';
          return g + '</g>';
        };
        return '<ellipse cx="256" cy="560" rx="360" ry="170" fill="url(#kbhl)"/><ellipse cx="200" cy="410" rx="120" ry="18" fill="#fff" opacity=".12"/>'
          + '<g filter="url(#sh2)"><g transform="translate(410 420)"><path d="M-12 0H12L9 52H-9Z" fill="#f5ead2"/><path d="M-50 4C-50-40 50-40 50 4Z" fill="url(#kbcap)"/><circle cx="-20" cy="-14" r="8" fill="#fff"/><circle cx="14" cy="-22" r="6" fill="#fff"/><circle cx="30" cy="-4" r="5" fill="#fff"/></g>'
          + '<g transform="translate(96 446) scale(.7)"><path d="M-12 0H12L9 52H-9Z" fill="#f5ead2"/><path d="M-50 4C-50-40 50-40 50 4Z" fill="#f0a03a"/><circle cx="-20" cy="-14" r="8" fill="#fff"/><circle cx="16" cy="-20" r="6" fill="#fff"/></g></g>'
          + `<g filter="url(#sh)">${head(142, 300, .92, 0)}${head(370, 300, .92, 2)}${head(256, 330, 1.12, 1)}</g>`
          + spark(80, 140, 1.1, '#fffbe0') + spark(440, 150, .8, '#fffbe0') + spark(256, 70, .7, '#fff');
      })() }
