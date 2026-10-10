var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e3) {
    throw err = [e3], e3;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// vendor-src/sweph/wasm/swisseph.js
var swisseph_exports = {};
__export(swisseph_exports, {
  default: () => e
});
async function e(e3 = {}) {
  var r2, t2 = e3, o2 = "./this.program", n2 = import.meta.url, a2 = "";
  try {
    a2 = new URL(".", n2).href;
  } catch {
  }
  r2 = async (e4) => {
    var r3 = await fetch(e4, { credentials: "same-origin" });
    if (r3.ok) return r3.arrayBuffer();
    throw new Error(r3.status + " : " + r3.url);
  };
  var s2, i2, l2, d, u, c, m, f, _2, w, h2, p, v = console.log.bind(console), g = console.error.bind(console), y = false;
  function E2() {
    if (!y) {
      var e4 = ce();
      0 == e4 && (e4 += 4);
      var r3 = b(_2, e4 >> 2), t3 = b(_2, e4 + 4 >> 2);
      34821223 == r3 && 2310721022 == t3 || x(`Stack overflow! Stack cookie has been overwritten at ${T(e4)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${T(t3)} ${T(r3)}`);
    }
  }
  function k(e4, r3, t3) {
    const o3 = e4.BYTES_PER_ELEMENT, n3 = r3 * o3;
    if (r3 <= 0 && x(`segmentation fault ${t3} ${o3} bytes at address ${n3}`), F) {
      var a3 = fe(0);
      n3 + o3 > a3 && x(`segmentation fault, exceeded the top of the available dynamic heap when ${t3} ${o3} bytes at address ${n3}. DYNAMICTOP=${a3}`), a3 < me() && x(`brk >= _emscripten_stack_get_base() (brk=${a3}, _emscripten_stack_get_base()=${me()})`), a3 > d.buffer.byteLength && x(`brk <= wasmMemory.buffer.byteLength (brk=${a3}, wasmMemory.buffer.byteLength=${d.buffer.byteLength})`);
    }
    return r3;
  }
  function b(e4, r3) {
    return e4[k(e4, r3, "loading")];
  }
  function D(e4, r3, t3) {
    return e4[k(e4, r3, "storing")] = t3;
  }
  var S2, F = false;
  function A2() {
    var e4 = d.buffer;
    u = new Int8Array(e4), m = new Int16Array(e4), c = new Uint8Array(e4), f = new Int32Array(e4), _2 = new Uint32Array(e4), w = new Float32Array(e4), h2 = new Float64Array(e4), p = new BigInt64Array(e4), new BigUint64Array(e4);
  }
  function x(e4) {
    t2.onAbort?.(e4), g(e4 = "Aborted(" + e4 + ")"), y = true, e4 += ". Build with -sASSERTIONS for more info.";
    var r3 = new WebAssembly.RuntimeError(e4);
    throw l2?.(r3), r3;
  }
  function P() {
    return t2.locateFile ? (e4 = "swisseph.wasm", t2.locateFile ? t2.locateFile(e4, a2) : a2 + e4) : new URL("swisseph.wasm", import.meta.url).href;
    var e4;
  }
  async function M(e4) {
    if (!s2) try {
      var t3 = await r2(e4);
      return new Uint8Array(t3);
    } catch {
    }
    return (function(e5) {
      if (e5 == S2 && s2) return new Uint8Array(s2);
      throw "both async and sync fetching of the wasm failed";
    })(e4);
  }
  async function N(e4, r3, t3) {
    if (!e4) try {
      var o3 = fetch(r3, { credentials: "same-origin" });
      return await WebAssembly.instantiateStreaming(o3, t3);
    } catch (e5) {
      g(`wasm streaming compile failed: ${e5}`), g("falling back to ArrayBuffer instantiation");
    }
    return (async function(e5, r4) {
      try {
        var t4 = await M(e5);
        return await WebAssembly.instantiate(t4, r4);
      } catch (e6) {
        g(`failed to asynchronously prepare wasm: ${e6}`), x(e6);
      }
    })(r3, t3);
  }
  var B = (e4) => {
    for (; e4.length > 0; ) e4.shift()(t2);
  }, R = [], C = (e4) => R.push(e4), j = [], z = (e4) => j.push(e4);
  var T = (e4) => "0x" + (e4 >>>= 0).toString(16).padStart(8, "0");
  var I = () => {
    var e4 = b(f, +ae.varargs >> 2);
    return ae.varargs += 4, e4;
  }, L = I, O = { isAbs: (e4) => "/" === e4.charAt(0), splitPath: (e4) => /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(e4).slice(1), normalizeArray: (e4, r3) => {
    for (var t3 = 0, o3 = e4.length - 1; o3 >= 0; o3--) {
      var n3 = e4[o3];
      "." === n3 ? e4.splice(o3, 1) : ".." === n3 ? (e4.splice(o3, 1), t3++) : t3 && (e4.splice(o3, 1), t3--);
    }
    if (r3) for (; t3; t3--) e4.unshift("..");
    return e4;
  }, normalize: (e4) => {
    var r3 = O.isAbs(e4), t3 = "/" === e4.slice(-1);
    return (e4 = O.normalizeArray(e4.split("/").filter((e5) => !!e5), !r3).join("/")) || r3 || (e4 = "."), e4 && t3 && (e4 += "/"), (r3 ? "/" : "") + e4;
  }, dirname: (e4) => {
    var r3 = O.splitPath(e4), t3 = r3[0], o3 = r3[1];
    return t3 || o3 ? (o3 && (o3 = o3.slice(0, -1)), t3 + o3) : ".";
  }, basename: (e4) => e4 && e4.match(/([^\/]+|\/)\/*$/)[1], join: (...e4) => O.normalize(e4.join("/")), join2: (e4, r3) => O.normalize(e4 + "/" + r3) }, $ = (e4) => {
    ($ = (e5) => crypto.getRandomValues(e5))(e4);
  }, U = { resolve: (...e4) => {
    for (var r3 = "", t3 = false, o3 = e4.length - 1; o3 >= -1 && !t3; o3--) {
      var n3 = o3 >= 0 ? e4[o3] : oe.cwd();
      if ("string" != typeof n3) throw new TypeError("Arguments to path.resolve must be strings");
      if (!n3) return "";
      r3 = n3 + "/" + r3, t3 = O.isAbs(n3);
    }
    return (t3 ? "/" : "") + (r3 = O.normalizeArray(r3.split("/").filter((e5) => !!e5), !t3).join("/")) || ".";
  }, relative: (e4, r3) => {
    function t3(e5) {
      for (var r4 = 0; r4 < e5.length && "" === e5[r4]; r4++) ;
      for (var t4 = e5.length - 1; t4 >= 0 && "" === e5[t4]; t4--) ;
      return r4 > t4 ? [] : e5.slice(r4, t4 - r4 + 1);
    }
    e4 = U.resolve(e4).slice(1), r3 = U.resolve(r3).slice(1);
    for (var o3 = t3(e4.split("/")), n3 = t3(r3.split("/")), a3 = Math.min(o3.length, n3.length), s3 = a3, i3 = 0; i3 < a3; i3++) if (o3[i3] !== n3[i3]) {
      s3 = i3;
      break;
    }
    var l3 = [];
    for (i3 = s3; i3 < o3.length; i3++) l3.push("..");
    return (l3 = l3.concat(n3.slice(s3))).join("/");
  } }, q = "undefined" != typeof TextDecoder ? new TextDecoder() : void 0, W = (e4, r3 = 0, t3, o3) => {
    var n3 = ((e5, r4, t4, o4) => {
      var n4 = r4 + t4;
      if (o4) return n4;
      for (; e5[r4] && !(r4 >= n4); ) ++r4;
      return r4;
    })(e4, r3, t3, o3);
    if (n3 - r3 > 16 && e4.buffer && q) return q.decode(e4.subarray(r3, n3));
    for (var a3 = ""; r3 < n3; ) {
      var s3 = e4[r3++];
      if (128 & s3) {
        var i3 = 63 & e4[r3++];
        if (192 != (224 & s3)) {
          var l3 = 63 & e4[r3++];
          if ((s3 = 224 == (240 & s3) ? (15 & s3) << 12 | i3 << 6 | l3 : (7 & s3) << 18 | i3 << 12 | l3 << 6 | 63 & e4[r3++]) < 65536) a3 += String.fromCharCode(s3);
          else {
            var d2 = s3 - 65536;
            a3 += String.fromCharCode(55296 | d2 >> 10, 56320 | 1023 & d2);
          }
        } else a3 += String.fromCharCode((31 & s3) << 6 | i3);
      } else a3 += String.fromCharCode(s3);
    }
    return a3;
  }, H = [], V = (e4) => {
    for (var r3 = 0, t3 = 0; t3 < e4.length; ++t3) {
      var o3 = e4.charCodeAt(t3);
      o3 <= 127 ? r3++ : o3 <= 2047 ? r3 += 2 : o3 >= 55296 && o3 <= 57343 ? (r3 += 4, ++t3) : r3 += 3;
    }
    return r3;
  }, X = (e4, r3, t3, o3) => {
    if (!(o3 > 0)) return 0;
    for (var n3 = t3, a3 = t3 + o3 - 1, s3 = 0; s3 < e4.length; ++s3) {
      var i3 = e4.codePointAt(s3);
      if (i3 <= 127) {
        if (t3 >= a3) break;
        r3[t3++] = i3;
      } else if (i3 <= 2047) {
        if (t3 + 1 >= a3) break;
        r3[t3++] = 192 | i3 >> 6, r3[t3++] = 128 | 63 & i3;
      } else if (i3 <= 65535) {
        if (t3 + 2 >= a3) break;
        r3[t3++] = 224 | i3 >> 12, r3[t3++] = 128 | i3 >> 6 & 63, r3[t3++] = 128 | 63 & i3;
      } else {
        if (t3 + 3 >= a3) break;
        r3[t3++] = 240 | i3 >> 18, r3[t3++] = 128 | i3 >> 12 & 63, r3[t3++] = 128 | i3 >> 6 & 63, r3[t3++] = 128 | 63 & i3, s3++;
      }
    }
    return r3[t3] = 0, t3 - n3;
  }, G = (e4, r3, t3) => {
    var o3 = V(e4) + 1, n3 = new Array(o3), a3 = X(e4, n3, 0, n3.length);
    return n3.length = a3, n3;
  }, Y = { ttys: [], init() {
  }, shutdown() {
  }, register(e4, r3) {
    Y.ttys[e4] = { input: [], output: [], ops: r3 }, oe.registerDevice(e4, Y.stream_ops);
  }, stream_ops: { open(e4) {
    var r3 = Y.ttys[e4.node.rdev];
    if (!r3) throw new oe.ErrnoError(43);
    e4.tty = r3, e4.seekable = false;
  }, close(e4) {
    e4.tty.ops.fsync(e4.tty);
  }, fsync(e4) {
    e4.tty.ops.fsync(e4.tty);
  }, read(e4, r3, t3, o3, n3) {
    if (!e4.tty || !e4.tty.ops.get_char) throw new oe.ErrnoError(60);
    for (var a3 = 0, s3 = 0; s3 < o3; s3++) {
      var i3;
      try {
        i3 = e4.tty.ops.get_char(e4.tty);
      } catch (e5) {
        throw new oe.ErrnoError(29);
      }
      if (void 0 === i3 && 0 === a3) throw new oe.ErrnoError(6);
      if (null == i3) break;
      a3++, r3[t3 + s3] = i3;
    }
    return a3 && (e4.node.atime = Date.now()), a3;
  }, write(e4, r3, t3, o3, n3) {
    if (!e4.tty || !e4.tty.ops.put_char) throw new oe.ErrnoError(60);
    try {
      for (var a3 = 0; a3 < o3; a3++) e4.tty.ops.put_char(e4.tty, r3[t3 + a3]);
    } catch (e5) {
      throw new oe.ErrnoError(29);
    }
    return o3 && (e4.node.mtime = e4.node.ctime = Date.now()), a3;
  } }, default_tty_ops: { get_char: (e4) => (() => {
    if (!H.length) {
      var e5 = null;
      if ("undefined" != typeof window && "function" == typeof window.prompt && null !== (e5 = window.prompt("Input: ")) && (e5 += "\n"), !e5) return null;
      H = G(e5);
    }
    return H.shift();
  })(), put_char(e4, r3) {
    null === r3 || 10 === r3 ? (v(W(e4.output)), e4.output = []) : 0 != r3 && e4.output.push(r3);
  }, fsync(e4) {
    e4.output?.length > 0 && (v(W(e4.output)), e4.output = []);
  }, ioctl_tcgets: (e4) => ({ c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }), ioctl_tcsets: (e4, r3, t3) => 0, ioctl_tiocgwinsz: (e4) => [24, 80] }, default_tty1_ops: { put_char(e4, r3) {
    null === r3 || 10 === r3 ? (g(W(e4.output)), e4.output = []) : 0 != r3 && e4.output.push(r3);
  }, fsync(e4) {
    e4.output?.length > 0 && (g(W(e4.output)), e4.output = []);
  } } }, K = (e4) => {
    x();
  }, J = { ops_table: null, mount: (e4) => J.createNode(null, "/", 16895, 0), createNode(e4, r3, t3, o3) {
    if (oe.isBlkdev(t3) || oe.isFIFO(t3)) throw new oe.ErrnoError(63);
    J.ops_table ||= { dir: { node: { getattr: J.node_ops.getattr, setattr: J.node_ops.setattr, lookup: J.node_ops.lookup, mknod: J.node_ops.mknod, rename: J.node_ops.rename, unlink: J.node_ops.unlink, rmdir: J.node_ops.rmdir, readdir: J.node_ops.readdir, symlink: J.node_ops.symlink }, stream: { llseek: J.stream_ops.llseek } }, file: { node: { getattr: J.node_ops.getattr, setattr: J.node_ops.setattr }, stream: { llseek: J.stream_ops.llseek, read: J.stream_ops.read, write: J.stream_ops.write, mmap: J.stream_ops.mmap, msync: J.stream_ops.msync } }, link: { node: { getattr: J.node_ops.getattr, setattr: J.node_ops.setattr, readlink: J.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: J.node_ops.getattr, setattr: J.node_ops.setattr }, stream: oe.chrdev_stream_ops } };
    var n3 = oe.createNode(e4, r3, t3, o3);
    return oe.isDir(n3.mode) ? (n3.node_ops = J.ops_table.dir.node, n3.stream_ops = J.ops_table.dir.stream, n3.contents = {}) : oe.isFile(n3.mode) ? (n3.node_ops = J.ops_table.file.node, n3.stream_ops = J.ops_table.file.stream, n3.usedBytes = 0, n3.contents = null) : oe.isLink(n3.mode) ? (n3.node_ops = J.ops_table.link.node, n3.stream_ops = J.ops_table.link.stream) : oe.isChrdev(n3.mode) && (n3.node_ops = J.ops_table.chrdev.node, n3.stream_ops = J.ops_table.chrdev.stream), n3.atime = n3.mtime = n3.ctime = Date.now(), e4 && (e4.contents[r3] = n3, e4.atime = e4.mtime = e4.ctime = n3.atime), n3;
  }, getFileDataAsTypedArray: (e4) => e4.contents ? e4.contents.subarray ? e4.contents.subarray(0, e4.usedBytes) : new Uint8Array(e4.contents) : new Uint8Array(0), expandFileStorage(e4, r3) {
    var t3 = e4.contents ? e4.contents.length : 0;
    if (!(t3 >= r3)) {
      r3 = Math.max(r3, t3 * (t3 < 1048576 ? 2 : 1.125) >>> 0), 0 != t3 && (r3 = Math.max(r3, 256));
      var o3 = e4.contents;
      e4.contents = new Uint8Array(r3), e4.usedBytes > 0 && e4.contents.set(o3.subarray(0, e4.usedBytes), 0);
    }
  }, resizeFileStorage(e4, r3) {
    if (e4.usedBytes != r3) if (0 == r3) e4.contents = null, e4.usedBytes = 0;
    else {
      var t3 = e4.contents;
      e4.contents = new Uint8Array(r3), t3 && e4.contents.set(t3.subarray(0, Math.min(r3, e4.usedBytes))), e4.usedBytes = r3;
    }
  }, node_ops: { getattr(e4) {
    var r3 = {};
    return r3.dev = oe.isChrdev(e4.mode) ? e4.id : 1, r3.ino = e4.id, r3.mode = e4.mode, r3.nlink = 1, r3.uid = 0, r3.gid = 0, r3.rdev = e4.rdev, oe.isDir(e4.mode) ? r3.size = 4096 : oe.isFile(e4.mode) ? r3.size = e4.usedBytes : oe.isLink(e4.mode) ? r3.size = e4.link.length : r3.size = 0, r3.atime = new Date(e4.atime), r3.mtime = new Date(e4.mtime), r3.ctime = new Date(e4.ctime), r3.blksize = 4096, r3.blocks = Math.ceil(r3.size / r3.blksize), r3;
  }, setattr(e4, r3) {
    for (const t3 of ["mode", "atime", "mtime", "ctime"]) null != r3[t3] && (e4[t3] = r3[t3]);
    void 0 !== r3.size && J.resizeFileStorage(e4, r3.size);
  }, lookup(e4, r3) {
    throw J.doesNotExistError || (J.doesNotExistError = new oe.ErrnoError(44), J.doesNotExistError.stack = "<generic error, no stack>"), J.doesNotExistError;
  }, mknod: (e4, r3, t3, o3) => J.createNode(e4, r3, t3, o3), rename(e4, r3, t3) {
    var o3;
    try {
      o3 = oe.lookupNode(r3, t3);
    } catch (e5) {
    }
    if (o3) {
      if (oe.isDir(e4.mode)) for (var n3 in o3.contents) throw new oe.ErrnoError(55);
      oe.hashRemoveNode(o3);
    }
    delete e4.parent.contents[e4.name], r3.contents[t3] = e4, e4.name = t3, r3.ctime = r3.mtime = e4.parent.ctime = e4.parent.mtime = Date.now();
  }, unlink(e4, r3) {
    delete e4.contents[r3], e4.ctime = e4.mtime = Date.now();
  }, rmdir(e4, r3) {
    var t3 = oe.lookupNode(e4, r3);
    for (var o3 in t3.contents) throw new oe.ErrnoError(55);
    delete e4.contents[r3], e4.ctime = e4.mtime = Date.now();
  }, readdir: (e4) => [".", "..", ...Object.keys(e4.contents)], symlink(e4, r3, t3) {
    var o3 = J.createNode(e4, r3, 41471, 0);
    return o3.link = t3, o3;
  }, readlink(e4) {
    if (!oe.isLink(e4.mode)) throw new oe.ErrnoError(28);
    return e4.link;
  } }, stream_ops: { read(e4, r3, t3, o3, n3) {
    var a3 = e4.node.contents;
    if (n3 >= e4.node.usedBytes) return 0;
    var s3 = Math.min(e4.node.usedBytes - n3, o3);
    if (s3 > 8 && a3.subarray) r3.set(a3.subarray(n3, n3 + s3), t3);
    else for (var i3 = 0; i3 < s3; i3++) r3[t3 + i3] = a3[n3 + i3];
    return s3;
  }, write(e4, r3, t3, o3, n3, a3) {
    if (r3.buffer === u.buffer && (a3 = false), !o3) return 0;
    var s3 = e4.node;
    if (s3.mtime = s3.ctime = Date.now(), r3.subarray && (!s3.contents || s3.contents.subarray)) {
      if (a3) return s3.contents = r3.subarray(t3, t3 + o3), s3.usedBytes = o3, o3;
      if (0 === s3.usedBytes && 0 === n3) return s3.contents = r3.slice(t3, t3 + o3), s3.usedBytes = o3, o3;
      if (n3 + o3 <= s3.usedBytes) return s3.contents.set(r3.subarray(t3, t3 + o3), n3), o3;
    }
    if (J.expandFileStorage(s3, n3 + o3), s3.contents.subarray && r3.subarray) s3.contents.set(r3.subarray(t3, t3 + o3), n3);
    else for (var i3 = 0; i3 < o3; i3++) s3.contents[n3 + i3] = r3[t3 + i3];
    return s3.usedBytes = Math.max(s3.usedBytes, n3 + o3), o3;
  }, llseek(e4, r3, t3) {
    var o3 = r3;
    if (1 === t3 ? o3 += e4.position : 2 === t3 && oe.isFile(e4.node.mode) && (o3 += e4.node.usedBytes), o3 < 0) throw new oe.ErrnoError(28);
    return o3;
  }, mmap(e4, r3, t3, o3, n3) {
    if (!oe.isFile(e4.node.mode)) throw new oe.ErrnoError(43);
    var a3, s3, i3 = e4.node.contents;
    if (2 & n3 || !i3 || i3.buffer !== u.buffer) {
      if (s3 = true, !(a3 = K())) throw new oe.ErrnoError(48);
      i3 && ((t3 > 0 || t3 + r3 < i3.length) && (i3 = i3.subarray ? i3.subarray(t3, t3 + r3) : Array.prototype.slice.call(i3, t3, t3 + r3)), u.set(i3, a3));
    } else s3 = false, a3 = i3.byteOffset;
    return { ptr: a3, allocated: s3 };
  }, msync: (e4, r3, t3, o3, n3) => (J.stream_ops.write(e4, r3, 0, o3, t3, false), 0) } }, Q = (e4, r3) => {
    var t3 = 0;
    return e4 && (t3 |= 365), r3 && (t3 |= 146), t3;
  }, Z = 0, ee = null, re = [], te = async (e4, o3, n3, a3, s3, i3, l3, d2) => {
    var u2 = o3 ? U.resolve(O.join2(e4, o3)) : e4;
    Z++, t2.monitorRunDependencies?.(Z);
    try {
      var c2 = n3;
      "string" == typeof n3 && (c2 = await (async (e5) => {
        var t3 = await r2(e5);
        return new Uint8Array(t3);
      })(n3)), c2 = await (async (e5, r3) => {
        for (var t3 of ("undefined" != typeof Browser && Browser.init(), re)) if (t3.canHandle(r3)) return t3.handle(e5, r3);
        return e5;
      })(c2, u2), d2?.(), i3 || ((...e5) => {
        oe.createDataFile(...e5);
      })(e4, o3, c2, a3, s3, l3);
    } finally {
      (() => {
        if (Z--, t2.monitorRunDependencies?.(Z), 0 == Z && ee) {
          var e5 = ee;
          ee = null, e5();
        }
      })();
    }
  }, oe = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, filesystems: null, syncFSRequests: 0, readFiles: {}, ErrnoError: class {
    name = "ErrnoError";
    constructor(e4) {
      this.errno = e4;
    }
  }, FSStream: class {
    shared = {};
    get object() {
      return this.node;
    }
    set object(e4) {
      this.node = e4;
    }
    get isRead() {
      return 1 != (2097155 & this.flags);
    }
    get isWrite() {
      return !!(2097155 & this.flags);
    }
    get isAppend() {
      return 1024 & this.flags;
    }
    get flags() {
      return this.shared.flags;
    }
    set flags(e4) {
      this.shared.flags = e4;
    }
    get position() {
      return this.shared.position;
    }
    set position(e4) {
      this.shared.position = e4;
    }
  }, FSNode: class {
    node_ops = {};
    stream_ops = {};
    readMode = 365;
    writeMode = 146;
    mounted = null;
    constructor(e4, r3, t3, o3) {
      e4 || (e4 = this), this.parent = e4, this.mount = e4.mount, this.id = oe.nextInode++, this.name = r3, this.mode = t3, this.rdev = o3, this.atime = this.mtime = this.ctime = Date.now();
    }
    get read() {
      return (this.mode & this.readMode) === this.readMode;
    }
    set read(e4) {
      e4 ? this.mode |= this.readMode : this.mode &= ~this.readMode;
    }
    get write() {
      return (this.mode & this.writeMode) === this.writeMode;
    }
    set write(e4) {
      e4 ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
    }
    get isFolder() {
      return oe.isDir(this.mode);
    }
    get isDevice() {
      return oe.isChrdev(this.mode);
    }
  }, lookupPath(e4, r3 = {}) {
    if (!e4) throw new oe.ErrnoError(44);
    r3.follow_mount ??= true, O.isAbs(e4) || (e4 = oe.cwd() + "/" + e4);
    e: for (var t3 = 0; t3 < 40; t3++) {
      for (var o3 = e4.split("/").filter((e5) => !!e5), n3 = oe.root, a3 = "/", s3 = 0; s3 < o3.length; s3++) {
        var i3 = s3 === o3.length - 1;
        if (i3 && r3.parent) break;
        if ("." !== o3[s3]) if (".." !== o3[s3]) {
          a3 = O.join2(a3, o3[s3]);
          try {
            n3 = oe.lookupNode(n3, o3[s3]);
          } catch (e5) {
            if (44 === e5?.errno && i3 && r3.noent_okay) return { path: a3 };
            throw e5;
          }
          if (!oe.isMountpoint(n3) || i3 && !r3.follow_mount || (n3 = n3.mounted.root), oe.isLink(n3.mode) && (!i3 || r3.follow)) {
            if (!n3.node_ops.readlink) throw new oe.ErrnoError(52);
            var l3 = n3.node_ops.readlink(n3);
            O.isAbs(l3) || (l3 = O.dirname(a3) + "/" + l3), e4 = l3 + "/" + o3.slice(s3 + 1).join("/");
            continue e;
          }
        } else {
          if (a3 = O.dirname(a3), oe.isRoot(n3)) {
            e4 = a3 + "/" + o3.slice(s3 + 1).join("/"), t3--;
            continue e;
          }
          n3 = n3.parent;
        }
      }
      return { path: a3, node: n3 };
    }
    throw new oe.ErrnoError(32);
  }, getPath(e4) {
    for (var r3; ; ) {
      if (oe.isRoot(e4)) {
        var t3 = e4.mount.mountpoint;
        return r3 ? "/" !== t3[t3.length - 1] ? `${t3}/${r3}` : t3 + r3 : t3;
      }
      r3 = r3 ? `${e4.name}/${r3}` : e4.name, e4 = e4.parent;
    }
  }, hashName(e4, r3) {
    for (var t3 = 0, o3 = 0; o3 < r3.length; o3++) t3 = (t3 << 5) - t3 + r3.charCodeAt(o3) | 0;
    return (e4 + t3 >>> 0) % oe.nameTable.length;
  }, hashAddNode(e4) {
    var r3 = oe.hashName(e4.parent.id, e4.name);
    e4.name_next = oe.nameTable[r3], oe.nameTable[r3] = e4;
  }, hashRemoveNode(e4) {
    var r3 = oe.hashName(e4.parent.id, e4.name);
    if (oe.nameTable[r3] === e4) oe.nameTable[r3] = e4.name_next;
    else for (var t3 = oe.nameTable[r3]; t3; ) {
      if (t3.name_next === e4) {
        t3.name_next = e4.name_next;
        break;
      }
      t3 = t3.name_next;
    }
  }, lookupNode(e4, r3) {
    var t3 = oe.mayLookup(e4);
    if (t3) throw new oe.ErrnoError(t3);
    for (var o3 = oe.hashName(e4.id, r3), n3 = oe.nameTable[o3]; n3; n3 = n3.name_next) {
      var a3 = n3.name;
      if (n3.parent.id === e4.id && a3 === r3) return n3;
    }
    return oe.lookup(e4, r3);
  }, createNode(e4, r3, t3, o3) {
    var n3 = new oe.FSNode(e4, r3, t3, o3);
    return oe.hashAddNode(n3), n3;
  }, destroyNode(e4) {
    oe.hashRemoveNode(e4);
  }, isRoot: (e4) => e4 === e4.parent, isMountpoint: (e4) => !!e4.mounted, isFile: (e4) => 32768 == (61440 & e4), isDir: (e4) => 16384 == (61440 & e4), isLink: (e4) => 40960 == (61440 & e4), isChrdev: (e4) => 8192 == (61440 & e4), isBlkdev: (e4) => 24576 == (61440 & e4), isFIFO: (e4) => 4096 == (61440 & e4), isSocket: (e4) => !(49152 & ~e4), flagsToPermissionString(e4) {
    var r3 = ["r", "w", "rw"][3 & e4];
    return 512 & e4 && (r3 += "w"), r3;
  }, nodePermissions: (e4, r3) => oe.ignorePermissions || (!r3.includes("r") || 292 & e4.mode) && (!r3.includes("w") || 146 & e4.mode) && (!r3.includes("x") || 73 & e4.mode) ? 0 : 2, mayLookup(e4) {
    if (!oe.isDir(e4.mode)) return 54;
    var r3 = oe.nodePermissions(e4, "x");
    return r3 || (e4.node_ops.lookup ? 0 : 2);
  }, mayCreate(e4, r3) {
    if (!oe.isDir(e4.mode)) return 54;
    try {
      oe.lookupNode(e4, r3);
      return 20;
    } catch (e5) {
    }
    return oe.nodePermissions(e4, "wx");
  }, mayDelete(e4, r3, t3) {
    var o3;
    try {
      o3 = oe.lookupNode(e4, r3);
    } catch (e5) {
      return e5.errno;
    }
    var n3 = oe.nodePermissions(e4, "wx");
    if (n3) return n3;
    if (t3) {
      if (!oe.isDir(o3.mode)) return 54;
      if (oe.isRoot(o3) || oe.getPath(o3) === oe.cwd()) return 10;
    } else if (oe.isDir(o3.mode)) return 31;
    return 0;
  }, mayOpen: (e4, r3) => e4 ? oe.isLink(e4.mode) ? 32 : oe.isDir(e4.mode) && ("r" !== oe.flagsToPermissionString(r3) || 576 & r3) ? 31 : oe.nodePermissions(e4, oe.flagsToPermissionString(r3)) : 44, checkOpExists(e4, r3) {
    if (!e4) throw new oe.ErrnoError(r3);
    return e4;
  }, MAX_OPEN_FDS: 4096, nextfd() {
    for (var e4 = 0; e4 <= oe.MAX_OPEN_FDS; e4++) if (!oe.streams[e4]) return e4;
    throw new oe.ErrnoError(33);
  }, getStreamChecked(e4) {
    var r3 = oe.getStream(e4);
    if (!r3) throw new oe.ErrnoError(8);
    return r3;
  }, getStream: (e4) => oe.streams[e4], createStream: (e4, r3 = -1) => (e4 = Object.assign(new oe.FSStream(), e4), -1 == r3 && (r3 = oe.nextfd()), e4.fd = r3, oe.streams[r3] = e4, e4), closeStream(e4) {
    oe.streams[e4] = null;
  }, dupStream(e4, r3 = -1) {
    var t3 = oe.createStream(e4, r3);
    return t3.stream_ops?.dup?.(t3), t3;
  }, doSetAttr(e4, r3, t3) {
    var o3 = e4?.stream_ops.setattr, n3 = o3 ? e4 : r3;
    o3 ??= r3.node_ops.setattr, oe.checkOpExists(o3, 63), o3(n3, t3);
  }, chrdev_stream_ops: { open(e4) {
    var r3 = oe.getDevice(e4.node.rdev);
    e4.stream_ops = r3.stream_ops, e4.stream_ops.open?.(e4);
  }, llseek() {
    throw new oe.ErrnoError(70);
  } }, major: (e4) => e4 >> 8, minor: (e4) => 255 & e4, makedev: (e4, r3) => e4 << 8 | r3, registerDevice(e4, r3) {
    oe.devices[e4] = { stream_ops: r3 };
  }, getDevice: (e4) => oe.devices[e4], getMounts(e4) {
    for (var r3 = [], t3 = [e4]; t3.length; ) {
      var o3 = t3.pop();
      r3.push(o3), t3.push(...o3.mounts);
    }
    return r3;
  }, syncfs(e4, r3) {
    "function" == typeof e4 && (r3 = e4, e4 = false), oe.syncFSRequests++, oe.syncFSRequests > 1 && g(`warning: ${oe.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
    var t3 = oe.getMounts(oe.root.mount), o3 = 0;
    function n3(e5) {
      return oe.syncFSRequests--, r3(e5);
    }
    function a3(e5) {
      if (e5) return a3.errored ? void 0 : (a3.errored = true, n3(e5));
      ++o3 >= t3.length && n3(null);
    }
    t3.forEach((r4) => {
      if (!r4.type.syncfs) return a3(null);
      r4.type.syncfs(r4, e4, a3);
    });
  }, mount(e4, r3, t3) {
    var o3, n3 = "/" === t3, a3 = !t3;
    if (n3 && oe.root) throw new oe.ErrnoError(10);
    if (!n3 && !a3) {
      var s3 = oe.lookupPath(t3, { follow_mount: false });
      if (t3 = s3.path, o3 = s3.node, oe.isMountpoint(o3)) throw new oe.ErrnoError(10);
      if (!oe.isDir(o3.mode)) throw new oe.ErrnoError(54);
    }
    var i3 = { type: e4, opts: r3, mountpoint: t3, mounts: [] }, l3 = e4.mount(i3);
    return l3.mount = i3, i3.root = l3, n3 ? oe.root = l3 : o3 && (o3.mounted = i3, o3.mount && o3.mount.mounts.push(i3)), l3;
  }, unmount(e4) {
    var r3 = oe.lookupPath(e4, { follow_mount: false });
    if (!oe.isMountpoint(r3.node)) throw new oe.ErrnoError(28);
    var t3 = r3.node, o3 = t3.mounted, n3 = oe.getMounts(o3);
    Object.keys(oe.nameTable).forEach((e5) => {
      for (var r4 = oe.nameTable[e5]; r4; ) {
        var t4 = r4.name_next;
        n3.includes(r4.mount) && oe.destroyNode(r4), r4 = t4;
      }
    }), t3.mounted = null;
    var a3 = t3.mount.mounts.indexOf(o3);
    t3.mount.mounts.splice(a3, 1);
  }, lookup: (e4, r3) => e4.node_ops.lookup(e4, r3), mknod(e4, r3, t3) {
    var o3 = oe.lookupPath(e4, { parent: true }).node, n3 = O.basename(e4);
    if (!n3) throw new oe.ErrnoError(28);
    if ("." === n3 || ".." === n3) throw new oe.ErrnoError(20);
    var a3 = oe.mayCreate(o3, n3);
    if (a3) throw new oe.ErrnoError(a3);
    if (!o3.node_ops.mknod) throw new oe.ErrnoError(63);
    return o3.node_ops.mknod(o3, n3, r3, t3);
  }, statfs: (e4) => oe.statfsNode(oe.lookupPath(e4, { follow: true }).node), statfsStream: (e4) => oe.statfsNode(e4.node), statfsNode(e4) {
    var r3 = { bsize: 4096, frsize: 4096, blocks: 1e6, bfree: 5e5, bavail: 5e5, files: oe.nextInode, ffree: oe.nextInode - 1, fsid: 42, flags: 2, namelen: 255 };
    return e4.node_ops.statfs && Object.assign(r3, e4.node_ops.statfs(e4.mount.opts.root)), r3;
  }, create: (e4, r3 = 438) => (r3 &= 4095, r3 |= 32768, oe.mknod(e4, r3, 0)), mkdir: (e4, r3 = 511) => (r3 &= 1023, r3 |= 16384, oe.mknod(e4, r3, 0)), mkdirTree(e4, r3) {
    var t3 = e4.split("/"), o3 = "";
    for (var n3 of t3) if (n3) {
      (o3 || O.isAbs(e4)) && (o3 += "/"), o3 += n3;
      try {
        oe.mkdir(o3, r3);
      } catch (e5) {
        if (20 != e5.errno) throw e5;
      }
    }
  }, mkdev: (e4, r3, t3) => (void 0 === t3 && (t3 = r3, r3 = 438), r3 |= 8192, oe.mknod(e4, r3, t3)), symlink(e4, r3) {
    if (!U.resolve(e4)) throw new oe.ErrnoError(44);
    var t3 = oe.lookupPath(r3, { parent: true }).node;
    if (!t3) throw new oe.ErrnoError(44);
    var o3 = O.basename(r3), n3 = oe.mayCreate(t3, o3);
    if (n3) throw new oe.ErrnoError(n3);
    if (!t3.node_ops.symlink) throw new oe.ErrnoError(63);
    return t3.node_ops.symlink(t3, o3, e4);
  }, rename(e4, r3) {
    var t3, o3, n3 = O.dirname(e4), a3 = O.dirname(r3), s3 = O.basename(e4), i3 = O.basename(r3);
    if (t3 = oe.lookupPath(e4, { parent: true }).node, o3 = oe.lookupPath(r3, { parent: true }).node, !t3 || !o3) throw new oe.ErrnoError(44);
    if (t3.mount !== o3.mount) throw new oe.ErrnoError(75);
    var l3, d2 = oe.lookupNode(t3, s3), u2 = U.relative(e4, a3);
    if ("." !== u2.charAt(0)) throw new oe.ErrnoError(28);
    if ("." !== (u2 = U.relative(r3, n3)).charAt(0)) throw new oe.ErrnoError(55);
    try {
      l3 = oe.lookupNode(o3, i3);
    } catch (e5) {
    }
    if (d2 !== l3) {
      var c2 = oe.isDir(d2.mode), m2 = oe.mayDelete(t3, s3, c2);
      if (m2) throw new oe.ErrnoError(m2);
      if (m2 = l3 ? oe.mayDelete(o3, i3, c2) : oe.mayCreate(o3, i3)) throw new oe.ErrnoError(m2);
      if (!t3.node_ops.rename) throw new oe.ErrnoError(63);
      if (oe.isMountpoint(d2) || l3 && oe.isMountpoint(l3)) throw new oe.ErrnoError(10);
      if (o3 !== t3 && (m2 = oe.nodePermissions(t3, "w"))) throw new oe.ErrnoError(m2);
      oe.hashRemoveNode(d2);
      try {
        t3.node_ops.rename(d2, o3, i3), d2.parent = o3;
      } catch (e5) {
        throw e5;
      } finally {
        oe.hashAddNode(d2);
      }
    }
  }, rmdir(e4) {
    var r3 = oe.lookupPath(e4, { parent: true }).node, t3 = O.basename(e4), o3 = oe.lookupNode(r3, t3), n3 = oe.mayDelete(r3, t3, true);
    if (n3) throw new oe.ErrnoError(n3);
    if (!r3.node_ops.rmdir) throw new oe.ErrnoError(63);
    if (oe.isMountpoint(o3)) throw new oe.ErrnoError(10);
    r3.node_ops.rmdir(r3, t3), oe.destroyNode(o3);
  }, readdir(e4) {
    var r3 = oe.lookupPath(e4, { follow: true }).node;
    return oe.checkOpExists(r3.node_ops.readdir, 54)(r3);
  }, unlink(e4) {
    var r3 = oe.lookupPath(e4, { parent: true }).node;
    if (!r3) throw new oe.ErrnoError(44);
    var t3 = O.basename(e4), o3 = oe.lookupNode(r3, t3), n3 = oe.mayDelete(r3, t3, false);
    if (n3) throw new oe.ErrnoError(n3);
    if (!r3.node_ops.unlink) throw new oe.ErrnoError(63);
    if (oe.isMountpoint(o3)) throw new oe.ErrnoError(10);
    r3.node_ops.unlink(r3, t3), oe.destroyNode(o3);
  }, readlink(e4) {
    var r3 = oe.lookupPath(e4).node;
    if (!r3) throw new oe.ErrnoError(44);
    if (!r3.node_ops.readlink) throw new oe.ErrnoError(28);
    return r3.node_ops.readlink(r3);
  }, stat(e4, r3) {
    var t3 = oe.lookupPath(e4, { follow: !r3 }).node;
    return oe.checkOpExists(t3.node_ops.getattr, 63)(t3);
  }, fstat(e4) {
    var r3 = oe.getStreamChecked(e4), t3 = r3.node, o3 = r3.stream_ops.getattr, n3 = o3 ? r3 : t3;
    return o3 ??= t3.node_ops.getattr, oe.checkOpExists(o3, 63), o3(n3);
  }, lstat: (e4) => oe.stat(e4, true), doChmod(e4, r3, t3, o3) {
    oe.doSetAttr(e4, r3, { mode: 4095 & t3 | -4096 & r3.mode, ctime: Date.now(), dontFollow: o3 });
  }, chmod(e4, r3, t3) {
    var o3;
    "string" == typeof e4 ? o3 = oe.lookupPath(e4, { follow: !t3 }).node : o3 = e4;
    oe.doChmod(null, o3, r3, t3);
  }, lchmod(e4, r3) {
    oe.chmod(e4, r3, true);
  }, fchmod(e4, r3) {
    var t3 = oe.getStreamChecked(e4);
    oe.doChmod(t3, t3.node, r3, false);
  }, doChown(e4, r3, t3) {
    oe.doSetAttr(e4, r3, { timestamp: Date.now(), dontFollow: t3 });
  }, chown(e4, r3, t3, o3) {
    var n3;
    "string" == typeof e4 ? n3 = oe.lookupPath(e4, { follow: !o3 }).node : n3 = e4;
    oe.doChown(null, n3, o3);
  }, lchown(e4, r3, t3) {
    oe.chown(e4, r3, t3, true);
  }, fchown(e4, r3, t3) {
    var o3 = oe.getStreamChecked(e4);
    oe.doChown(o3, o3.node, false);
  }, doTruncate(e4, r3, t3) {
    if (oe.isDir(r3.mode)) throw new oe.ErrnoError(31);
    if (!oe.isFile(r3.mode)) throw new oe.ErrnoError(28);
    var o3 = oe.nodePermissions(r3, "w");
    if (o3) throw new oe.ErrnoError(o3);
    oe.doSetAttr(e4, r3, { size: t3, timestamp: Date.now() });
  }, truncate(e4, r3) {
    if (r3 < 0) throw new oe.ErrnoError(28);
    var t3;
    "string" == typeof e4 ? t3 = oe.lookupPath(e4, { follow: true }).node : t3 = e4;
    oe.doTruncate(null, t3, r3);
  }, ftruncate(e4, r3) {
    var t3 = oe.getStreamChecked(e4);
    if (r3 < 0 || !(2097155 & t3.flags)) throw new oe.ErrnoError(28);
    oe.doTruncate(t3, t3.node, r3);
  }, utime(e4, r3, t3) {
    var o3 = oe.lookupPath(e4, { follow: true }).node;
    oe.checkOpExists(o3.node_ops.setattr, 63)(o3, { atime: r3, mtime: t3 });
  }, open(e4, r3, o3 = 438) {
    if ("" === e4) throw new oe.ErrnoError(44);
    var n3, a3;
    if (o3 = 64 & (r3 = "string" == typeof r3 ? ((e5) => {
      var r4 = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[e5];
      if (void 0 === r4) throw new Error(`Unknown file open mode: ${e5}`);
      return r4;
    })(r3) : r3) ? 4095 & o3 | 32768 : 0, "object" == typeof e4) n3 = e4;
    else {
      a3 = e4.endsWith("/");
      var s3 = oe.lookupPath(e4, { follow: !(131072 & r3), noent_okay: true });
      n3 = s3.node, e4 = s3.path;
    }
    var i3 = false;
    if (64 & r3) if (n3) {
      if (128 & r3) throw new oe.ErrnoError(20);
    } else {
      if (a3) throw new oe.ErrnoError(31);
      n3 = oe.mknod(e4, 511 | o3, 0), i3 = true;
    }
    if (!n3) throw new oe.ErrnoError(44);
    if (oe.isChrdev(n3.mode) && (r3 &= -513), 65536 & r3 && !oe.isDir(n3.mode)) throw new oe.ErrnoError(54);
    if (!i3) {
      var l3 = oe.mayOpen(n3, r3);
      if (l3) throw new oe.ErrnoError(l3);
    }
    512 & r3 && !i3 && oe.truncate(n3, 0), r3 &= -131713;
    var d2 = oe.createStream({ node: n3, path: oe.getPath(n3), flags: r3, seekable: true, position: 0, stream_ops: n3.stream_ops, ungotten: [], error: false });
    return d2.stream_ops.open && d2.stream_ops.open(d2), i3 && oe.chmod(n3, 511 & o3), !t2.logReadFiles || 1 & r3 || e4 in oe.readFiles || (oe.readFiles[e4] = 1), d2;
  }, close(e4) {
    if (oe.isClosed(e4)) throw new oe.ErrnoError(8);
    e4.getdents && (e4.getdents = null);
    try {
      e4.stream_ops.close && e4.stream_ops.close(e4);
    } catch (e5) {
      throw e5;
    } finally {
      oe.closeStream(e4.fd);
    }
    e4.fd = null;
  }, isClosed: (e4) => null === e4.fd, llseek(e4, r3, t3) {
    if (oe.isClosed(e4)) throw new oe.ErrnoError(8);
    if (!e4.seekable || !e4.stream_ops.llseek) throw new oe.ErrnoError(70);
    if (0 != t3 && 1 != t3 && 2 != t3) throw new oe.ErrnoError(28);
    return e4.position = e4.stream_ops.llseek(e4, r3, t3), e4.ungotten = [], e4.position;
  }, read(e4, r3, t3, o3, n3) {
    if (o3 < 0 || n3 < 0) throw new oe.ErrnoError(28);
    if (oe.isClosed(e4)) throw new oe.ErrnoError(8);
    if (1 == (2097155 & e4.flags)) throw new oe.ErrnoError(8);
    if (oe.isDir(e4.node.mode)) throw new oe.ErrnoError(31);
    if (!e4.stream_ops.read) throw new oe.ErrnoError(28);
    var a3 = void 0 !== n3;
    if (a3) {
      if (!e4.seekable) throw new oe.ErrnoError(70);
    } else n3 = e4.position;
    var s3 = e4.stream_ops.read(e4, r3, t3, o3, n3);
    return a3 || (e4.position += s3), s3;
  }, write(e4, r3, t3, o3, n3, a3) {
    if (o3 < 0 || n3 < 0) throw new oe.ErrnoError(28);
    if (oe.isClosed(e4)) throw new oe.ErrnoError(8);
    if (!(2097155 & e4.flags)) throw new oe.ErrnoError(8);
    if (oe.isDir(e4.node.mode)) throw new oe.ErrnoError(31);
    if (!e4.stream_ops.write) throw new oe.ErrnoError(28);
    e4.seekable && 1024 & e4.flags && oe.llseek(e4, 0, 2);
    var s3 = void 0 !== n3;
    if (s3) {
      if (!e4.seekable) throw new oe.ErrnoError(70);
    } else n3 = e4.position;
    var i3 = e4.stream_ops.write(e4, r3, t3, o3, n3, a3);
    return s3 || (e4.position += i3), i3;
  }, mmap(e4, r3, t3, o3, n3) {
    if (2 & o3 && !(2 & n3) && 2 != (2097155 & e4.flags)) throw new oe.ErrnoError(2);
    if (1 == (2097155 & e4.flags)) throw new oe.ErrnoError(2);
    if (!e4.stream_ops.mmap) throw new oe.ErrnoError(43);
    if (!r3) throw new oe.ErrnoError(28);
    return e4.stream_ops.mmap(e4, r3, t3, o3, n3);
  }, msync: (e4, r3, t3, o3, n3) => e4.stream_ops.msync ? e4.stream_ops.msync(e4, r3, t3, o3, n3) : 0, ioctl(e4, r3, t3) {
    if (!e4.stream_ops.ioctl) throw new oe.ErrnoError(59);
    return e4.stream_ops.ioctl(e4, r3, t3);
  }, readFile(e4, r3 = {}) {
    if (r3.flags = r3.flags || 0, r3.encoding = r3.encoding || "binary", "utf8" !== r3.encoding && "binary" !== r3.encoding) throw new Error(`Invalid encoding type "${r3.encoding}"`);
    var t3 = oe.open(e4, r3.flags), o3 = oe.stat(e4).size, n3 = new Uint8Array(o3);
    return oe.read(t3, n3, 0, o3, 0), "utf8" === r3.encoding && (n3 = W(n3)), oe.close(t3), n3;
  }, writeFile(e4, r3, t3 = {}) {
    t3.flags = t3.flags || 577;
    var o3 = oe.open(e4, t3.flags, t3.mode);
    if ("string" == typeof r3 && (r3 = new Uint8Array(G(r3))), !ArrayBuffer.isView(r3)) throw new Error("Unsupported data type");
    oe.write(o3, r3, 0, r3.byteLength, void 0, t3.canOwn), oe.close(o3);
  }, cwd: () => oe.currentPath, chdir(e4) {
    var r3 = oe.lookupPath(e4, { follow: true });
    if (null === r3.node) throw new oe.ErrnoError(44);
    if (!oe.isDir(r3.node.mode)) throw new oe.ErrnoError(54);
    var t3 = oe.nodePermissions(r3.node, "x");
    if (t3) throw new oe.ErrnoError(t3);
    oe.currentPath = r3.path;
  }, createDefaultDirectories() {
    oe.mkdir("/tmp"), oe.mkdir("/home"), oe.mkdir("/home/web_user");
  }, createDefaultDevices() {
    oe.mkdir("/dev"), oe.registerDevice(oe.makedev(1, 3), { read: () => 0, write: (e5, r4, t4, o3, n3) => o3, llseek: () => 0 }), oe.mkdev("/dev/null", oe.makedev(1, 3)), Y.register(oe.makedev(5, 0), Y.default_tty_ops), Y.register(oe.makedev(6, 0), Y.default_tty1_ops), oe.mkdev("/dev/tty", oe.makedev(5, 0)), oe.mkdev("/dev/tty1", oe.makedev(6, 0));
    var e4 = new Uint8Array(1024), r3 = 0, t3 = () => (0 === r3 && ($(e4), r3 = e4.byteLength), e4[--r3]);
    oe.createDevice("/dev", "random", t3), oe.createDevice("/dev", "urandom", t3), oe.mkdir("/dev/shm"), oe.mkdir("/dev/shm/tmp");
  }, createSpecialDirectories() {
    oe.mkdir("/proc");
    var e4 = oe.mkdir("/proc/self");
    oe.mkdir("/proc/self/fd"), oe.mount({ mount() {
      var r3 = oe.createNode(e4, "fd", 16895, 73);
      return r3.stream_ops = { llseek: J.stream_ops.llseek }, r3.node_ops = { lookup(e5, r4) {
        var t3 = +r4, o3 = oe.getStreamChecked(t3), n3 = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => o3.path }, id: t3 + 1 };
        return n3.parent = n3, n3;
      }, readdir: () => Array.from(oe.streams.entries()).filter(([e5, r4]) => r4).map(([e5, r4]) => e5.toString()) }, r3;
    } }, {}, "/proc/self/fd");
  }, createStandardStreams(e4, r3, t3) {
    e4 ? oe.createDevice("/dev", "stdin", e4) : oe.symlink("/dev/tty", "/dev/stdin"), r3 ? oe.createDevice("/dev", "stdout", null, r3) : oe.symlink("/dev/tty", "/dev/stdout"), t3 ? oe.createDevice("/dev", "stderr", null, t3) : oe.symlink("/dev/tty1", "/dev/stderr"), oe.open("/dev/stdin", 0), oe.open("/dev/stdout", 1), oe.open("/dev/stderr", 1);
  }, staticInit() {
    oe.nameTable = new Array(4096), oe.mount(J, {}, "/"), oe.createDefaultDirectories(), oe.createDefaultDevices(), oe.createSpecialDirectories(), oe.filesystems = { MEMFS: J };
  }, init(e4, r3, o3) {
    oe.initialized = true, e4 ??= t2.stdin, r3 ??= t2.stdout, o3 ??= t2.stderr, oe.createStandardStreams(e4, r3, o3);
  }, quit() {
    for (var e4 of (oe.initialized = false, oe.streams)) e4 && oe.close(e4);
  }, findObject(e4, r3) {
    var t3 = oe.analyzePath(e4, r3);
    return t3.exists ? t3.object : null;
  }, analyzePath(e4, r3) {
    try {
      e4 = (o3 = oe.lookupPath(e4, { follow: !r3 })).path;
    } catch (e5) {
    }
    var t3 = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
    try {
      var o3 = oe.lookupPath(e4, { parent: true });
      t3.parentExists = true, t3.parentPath = o3.path, t3.parentObject = o3.node, t3.name = O.basename(e4), o3 = oe.lookupPath(e4, { follow: !r3 }), t3.exists = true, t3.path = o3.path, t3.object = o3.node, t3.name = o3.node.name, t3.isRoot = "/" === o3.path;
    } catch (e5) {
      t3.error = e5.errno;
    }
    return t3;
  }, createPath(e4, r3, t3, o3) {
    e4 = "string" == typeof e4 ? e4 : oe.getPath(e4);
    for (var n3 = r3.split("/").reverse(); n3.length; ) {
      var a3 = n3.pop();
      if (a3) {
        var s3 = O.join2(e4, a3);
        try {
          oe.mkdir(s3);
        } catch (e5) {
          if (20 != e5.errno) throw e5;
        }
        e4 = s3;
      }
    }
    return s3;
  }, createFile(e4, r3, t3, o3, n3) {
    var a3 = O.join2("string" == typeof e4 ? e4 : oe.getPath(e4), r3), s3 = Q(o3, n3);
    return oe.create(a3, s3);
  }, createDataFile(e4, r3, t3, o3, n3, a3) {
    var s3 = r3;
    e4 && (e4 = "string" == typeof e4 ? e4 : oe.getPath(e4), s3 = r3 ? O.join2(e4, r3) : e4);
    var i3 = Q(o3, n3), l3 = oe.create(s3, i3);
    if (t3) {
      if ("string" == typeof t3) {
        for (var d2 = new Array(t3.length), u2 = 0, c2 = t3.length; u2 < c2; ++u2) d2[u2] = t3.charCodeAt(u2);
        t3 = d2;
      }
      oe.chmod(l3, 146 | i3);
      var m2 = oe.open(l3, 577);
      oe.write(m2, t3, 0, t3.length, 0, a3), oe.close(m2), oe.chmod(l3, i3);
    }
  }, createDevice(e4, r3, t3, o3) {
    var n3 = O.join2("string" == typeof e4 ? e4 : oe.getPath(e4), r3), a3 = Q(!!t3, !!o3);
    oe.createDevice.major ??= 64;
    var s3 = oe.makedev(oe.createDevice.major++, 0);
    return oe.registerDevice(s3, { open(e5) {
      e5.seekable = false;
    }, close(e5) {
      o3?.buffer?.length && o3(10);
    }, read(e5, r4, o4, n4, a4) {
      for (var s4 = 0, i3 = 0; i3 < n4; i3++) {
        var l3;
        try {
          l3 = t3();
        } catch (e6) {
          throw new oe.ErrnoError(29);
        }
        if (void 0 === l3 && 0 === s4) throw new oe.ErrnoError(6);
        if (null == l3) break;
        s4++, r4[o4 + i3] = l3;
      }
      return s4 && (e5.node.atime = Date.now()), s4;
    }, write(e5, r4, t4, n4, a4) {
      for (var s4 = 0; s4 < n4; s4++) try {
        o3(r4[t4 + s4]);
      } catch (e6) {
        throw new oe.ErrnoError(29);
      }
      return n4 && (e5.node.mtime = e5.node.ctime = Date.now()), s4;
    } }), oe.mkdev(n3, a3, s3);
  }, forceLoadFile(e4) {
    if (e4.isDevice || e4.isFolder || e4.link || e4.contents) return true;
    if ("undefined" != typeof XMLHttpRequest) throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    try {
      e4.contents = (void 0)(e4.url);
    } catch (e5) {
      throw new oe.ErrnoError(29);
    }
  }, createLazyFile(e4, r3, t3, o3, n3) {
    if ("undefined" != typeof XMLHttpRequest) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
    var a3 = { isDevice: false, url: t3 }, s3 = oe.createFile(e4, r3, a3, o3, n3);
    a3.contents ? s3.contents = a3.contents : a3.url && (s3.contents = null, s3.url = a3.url), Object.defineProperties(s3, { usedBytes: { get: function() {
      return this.contents.length;
    } } });
    var i3 = {};
    function l3(e5, r4, t4, o4, n4) {
      var a4 = e5.node.contents;
      if (n4 >= a4.length) return 0;
      var s4 = Math.min(a4.length - n4, o4);
      if (a4.slice) for (var i4 = 0; i4 < s4; i4++) r4[t4 + i4] = a4[n4 + i4];
      else for (i4 = 0; i4 < s4; i4++) r4[t4 + i4] = a4.get(n4 + i4);
      return s4;
    }
    return Object.keys(s3.stream_ops).forEach((e5) => {
      var r4 = s3.stream_ops[e5];
      i3[e5] = (...e6) => (oe.forceLoadFile(s3), r4(...e6));
    }), i3.read = (e5, r4, t4, o4, n4) => (oe.forceLoadFile(s3), l3(e5, r4, t4, o4, n4)), i3.mmap = (e5, r4, t4, o4, n4) => {
      oe.forceLoadFile(s3);
      var a4 = K();
      if (!a4) throw new oe.ErrnoError(48);
      return l3(e5, u, a4, r4, t4), { ptr: a4, allocated: true };
    }, s3.stream_ops = i3, s3;
  } }, ne = (e4, r3, t3) => e4 ? W(c, e4, r3, t3) : "", ae = { DEFAULT_POLLMASK: 5, calculateAt(e4, r3, t3) {
    if (O.isAbs(r3)) return r3;
    var o3;
    -100 === e4 ? o3 = oe.cwd() : o3 = ae.getStreamFromFD(e4).path;
    if (0 == r3.length) {
      if (!t3) throw new oe.ErrnoError(44);
      return o3;
    }
    return o3 + "/" + r3;
  }, writeStat(e4, r3) {
    D(_2, e4 >> 2, r3.dev), D(_2, e4 + 4 >> 2, r3.mode), D(_2, e4 + 8 >> 2, r3.nlink), D(_2, e4 + 12 >> 2, r3.uid), D(_2, e4 + 16 >> 2, r3.gid), D(_2, e4 + 20 >> 2, r3.rdev), D(p, e4 + 24 >> 3, BigInt(r3.size)), D(f, e4 + 32 >> 2, 4096), D(f, e4 + 36 >> 2, r3.blocks);
    var t3 = r3.atime.getTime(), o3 = r3.mtime.getTime(), n3 = r3.ctime.getTime();
    return D(p, e4 + 40 >> 3, BigInt(Math.floor(t3 / 1e3))), D(_2, e4 + 48 >> 2, t3 % 1e3 * 1e3 * 1e3), D(p, e4 + 56 >> 3, BigInt(Math.floor(o3 / 1e3))), D(_2, e4 + 64 >> 2, o3 % 1e3 * 1e3 * 1e3), D(p, e4 + 72 >> 3, BigInt(Math.floor(n3 / 1e3))), D(_2, e4 + 80 >> 2, n3 % 1e3 * 1e3 * 1e3), D(p, e4 + 88 >> 3, BigInt(r3.ino)), 0;
  }, writeStatFs(e4, r3) {
    D(_2, e4 + 4 >> 2, r3.bsize), D(_2, e4 + 60 >> 2, r3.bsize), D(p, e4 + 8 >> 3, BigInt(r3.blocks)), D(p, e4 + 16 >> 3, BigInt(r3.bfree)), D(p, e4 + 24 >> 3, BigInt(r3.bavail)), D(p, e4 + 32 >> 3, BigInt(r3.files)), D(p, e4 + 40 >> 3, BigInt(r3.ffree)), D(_2, e4 + 48 >> 2, r3.fsid), D(_2, e4 + 64 >> 2, r3.flags), D(_2, e4 + 56 >> 2, r3.namelen);
  }, doMsync(e4, r3, t3, o3, n3) {
    if (!oe.isFile(r3.node.mode)) throw new oe.ErrnoError(43);
    if (2 & o3) return 0;
    var a3 = c.slice(e4, e4 + t3);
    oe.msync(r3, a3, n3, t3, o3);
  }, getStreamFromFD: (e4) => oe.getStreamChecked(e4), varargs: void 0, getStr: (e4) => ne(e4) };
  var se = (e4, r3, t3) => X(e4, c, r3, t3);
  var ie = (e4, r3) => Math.ceil(e4 / r3) * r3, le = (e4) => {
    var r3 = (e4 - d.buffer.byteLength + 65535) / 65536 | 0;
    try {
      return d.grow(r3), A2(), 1;
    } catch (e5) {
    }
  }, de = {}, ue = () => {
    if (!ue.strings) {
      var e4 = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: ("object" == typeof navigator && navigator.language || "C").replace("-", "_") + ".UTF-8", _: o2 || "./this.program" };
      for (var r3 in de) void 0 === de[r3] ? delete e4[r3] : e4[r3] = de[r3];
      var t3 = [];
      for (var r3 in e4) t3.push(`${r3}=${e4[r3]}`);
      ue.strings = t3;
    }
    return ue.strings;
  };
  var ce, me, fe, _e;
  if (oe.createPreloadedFile = (e4, r3, t3, o3, n3, a3, s3, i3, l3, d2) => {
    te(e4, r3, t3, o3, n3, i3, l3, d2).then(a3).catch(s3);
  }, oe.preloadFile = te, oe.staticInit(), t2.noExitRuntime && t2.noExitRuntime, t2.preloadPlugins && (re = t2.preloadPlugins), t2.print && (v = t2.print), t2.printErr && (g = t2.printErr), t2.wasmBinary && (s2 = t2.wasmBinary), t2.arguments && t2.arguments, t2.thisProgram && (o2 = t2.thisProgram), t2.preInit) for ("function" == typeof t2.preInit && (t2.preInit = [t2.preInit]); t2.preInit.length > 0; ) t2.preInit.shift()();
  t2.wasmMemory = d, t2.setValue = function(e4, r3, t3 = "i8") {
    switch (t3.endsWith("*") && (t3 = "*"), t3) {
      case "i1":
      case "i8":
        D(u, e4, r3);
        break;
      case "i16":
        D(m, e4 >> 1, r3);
        break;
      case "i32":
        D(f, e4 >> 2, r3);
        break;
      case "i64":
        D(p, e4 >> 3, BigInt(r3));
        break;
      case "float":
        D(w, e4 >> 2, r3);
        break;
      case "double":
        D(h2, e4 >> 3, r3);
        break;
      case "*":
        D(_2, e4 >> 2, r3);
        break;
      default:
        x(`invalid type for setValue: ${t3}`);
    }
  }, t2.getValue = function(e4, r3 = "i8") {
    switch (r3.endsWith("*") && (r3 = "*"), r3) {
      case "i1":
      case "i8":
        return b(u, e4);
      case "i16":
        return b(m, e4 >> 1);
      case "i32":
        return b(f, e4 >> 2);
      case "i64":
        return b(p, e4 >> 3);
      case "float":
        return b(w, e4 >> 2);
      case "double":
        return b(h2, e4 >> 3);
      case "*":
        return b(_2, e4 >> 2);
      default:
        x(`invalid type for getValue: ${r3}`);
    }
  }, t2.UTF8ToString = ne, t2.stringToUTF8 = se, t2.lengthBytesUTF8 = V, t2.FS = oe;
  var we, he = { e: function(e4, r3, t3) {
    ae.varargs = t3;
    try {
      var o3 = ae.getStreamFromFD(e4);
      switch (r3) {
        case 0:
          if ((n3 = I()) < 0) return -28;
          for (; oe.streams[n3]; ) n3++;
          return oe.dupStream(o3, n3).fd;
        case 1:
        case 2:
        case 13:
        case 14:
          return 0;
        case 3:
          return o3.flags;
        case 4:
          var n3 = I();
          return o3.flags |= n3, 0;
        case 12:
          n3 = L();
          return D(m, n3 + 0 >> 1, 2), 0;
      }
      return -28;
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return -e5.errno;
    }
  }, k: function(e4, r3, t3) {
    ae.varargs = t3;
    try {
      var o3 = ae.getStreamFromFD(e4);
      switch (r3) {
        case 21509:
        case 21510:
        case 21511:
        case 21512:
        case 21524:
        case 21515:
          return o3.tty ? 0 : -59;
        case 21505:
          if (!o3.tty) return -59;
          if (o3.tty.ops.ioctl_tcgets) {
            var n3 = o3.tty.ops.ioctl_tcgets(o3), a3 = L();
            D(f, a3 >> 2, n3.c_iflag || 0), D(f, a3 + 4 >> 2, n3.c_oflag || 0), D(f, a3 + 8 >> 2, n3.c_cflag || 0), D(f, a3 + 12 >> 2, n3.c_lflag || 0);
            for (var s3 = 0; s3 < 32; s3++) D(u, a3 + s3 + 17, n3.c_cc[s3] || 0);
            return 0;
          }
          return 0;
        case 21506:
        case 21507:
        case 21508:
          if (!o3.tty) return -59;
          if (o3.tty.ops.ioctl_tcsets) {
            a3 = L();
            var i3 = b(f, a3 >> 2), l3 = b(f, a3 + 4 >> 2), d2 = b(f, a3 + 8 >> 2), c2 = b(f, a3 + 12 >> 2), _3 = [];
            for (s3 = 0; s3 < 32; s3++) _3.push(b(u, a3 + s3 + 17));
            return o3.tty.ops.ioctl_tcsets(o3.tty, r3, { c_iflag: i3, c_oflag: l3, c_cflag: d2, c_lflag: c2, c_cc: _3 });
          }
          return 0;
        case 21519:
          if (!o3.tty) return -59;
          a3 = L();
          return D(f, a3 >> 2, 0), 0;
        case 21520:
          return o3.tty ? -28 : -59;
        case 21537:
        case 21531:
          a3 = L();
          return oe.ioctl(o3, r3, a3);
        case 21523:
          if (!o3.tty) return -59;
          if (o3.tty.ops.ioctl_tiocgwinsz) {
            var w2 = o3.tty.ops.ioctl_tiocgwinsz(o3.tty);
            a3 = L();
            D(m, a3 >> 1, w2[0]), D(m, a3 + 2 >> 1, w2[1]);
          }
          return 0;
        default:
          return -28;
      }
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return -e5.errno;
    }
  }, m: function(e4, r3, t3, o3) {
    ae.varargs = o3;
    try {
      r3 = ae.getStr(r3), r3 = ae.calculateAt(e4, r3);
      var n3 = o3 ? I() : 0;
      return oe.open(r3, t3, n3).fd;
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return -e5.errno;
    }
  }, f: function(e4, r3, t3, o3) {
    try {
      if (r3 = ae.getStr(r3), r3 = ae.calculateAt(e4, r3), o3 <= 0) return -28;
      var n3 = oe.readlink(r3), a3 = Math.min(o3, V(n3)), s3 = b(u, t3 + a3);
      return se(n3, t3, o3 + 1), D(u, t3 + a3, s3), a3;
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return -e5.errno;
    }
  }, b: function() {
    x("alignment fault");
  }, l: (e4) => {
    var r3 = c.length, t3 = 134217728;
    if ((e4 >>>= 0) > t3) return false;
    for (var o3 = 1; o3 <= 4; o3 *= 2) {
      var n3 = r3 * (1 + 0.2 / o3);
      n3 = Math.min(n3, e4 + 100663296);
      var a3 = Math.min(t3, ie(Math.max(e4, n3), 65536));
      if (le(a3)) return true;
    }
    return false;
  }, h: (e4, r3) => {
    var t3 = 0, o3 = 0;
    for (var n3 of ue()) {
      var a3 = r3 + t3;
      D(_2, e4 + o3 >> 2, a3), t3 += se(n3, a3, 1 / 0) + 1, o3 += 4;
    }
    return 0;
  }, i: (e4, r3) => {
    var t3 = ue();
    D(_2, e4 >> 2, t3.length);
    var o3 = 0;
    for (var n3 of t3) o3 += V(n3) + 1;
    return D(_2, r3 >> 2, o3), 0;
  }, c: function(e4) {
    try {
      var r3 = ae.getStreamFromFD(e4);
      return oe.close(r3), 0;
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return e5.errno;
    }
  }, j: function(e4, r3, t3, o3) {
    try {
      var n3 = ((e5, r4, t4, o4) => {
        for (var n4 = 0, a3 = 0; a3 < t4; a3++) {
          var s3 = b(_2, r4 >> 2), i3 = b(_2, r4 + 4 >> 2);
          r4 += 8;
          var l3 = oe.read(e5, u, s3, i3, o4);
          if (l3 < 0) return -1;
          if (n4 += l3, l3 < i3) break;
        }
        return n4;
      })(ae.getStreamFromFD(e4), r3, t3);
      return D(_2, o3 >> 2, n3), 0;
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return e5.errno;
    }
  }, g: function(e4, r3, t3, o3) {
    var n3;
    r3 = (n3 = r3) < -9007199254740992 || n3 > 9007199254740992 ? NaN : Number(n3);
    try {
      if (isNaN(r3)) return 61;
      var a3 = ae.getStreamFromFD(e4);
      return oe.llseek(a3, r3, t3), D(p, o3 >> 3, BigInt(a3.position)), a3.getdents && 0 === r3 && 0 === t3 && (a3.getdents = null), 0;
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return e5.errno;
    }
  }, d: function(e4, r3, t3, o3) {
    try {
      var n3 = ((e5, r4, t4, o4) => {
        for (var n4 = 0, a3 = 0; a3 < t4; a3++) {
          var s3 = b(_2, r4 >> 2), i3 = b(_2, r4 + 4 >> 2);
          r4 += 8;
          var l3 = oe.write(e5, u, s3, i3, o4);
          if (l3 < 0) return -1;
          if (n4 += l3, l3 < i3) break;
        }
        return n4;
      })(ae.getStreamFromFD(e4), r3, t3);
      return D(_2, o3 >> 2, n3), 0;
    } catch (e5) {
      if (void 0 === oe || "ErrnoError" !== e5.name) throw e5;
      return e5.errno;
    }
  }, a: function() {
    x("segmentation fault");
  } };
  function pe() {
    var e4;
    _e(), 0 == (e4 = ce()) && (e4 += 4), D(_2, e4 >> 2, 34821223), D(_2, e4 + 4 >> 2, 2310721022);
  }
  return we = await (async function() {
    function e4(e5, r4) {
      return we = e5.exports, d = we.n, t2.wasmMemory = d, A2(), (function(e6) {
        t2._swe_degnorm = e6.p, t2._swe_vis_limit_mag = e6.q, t2._swe_revjul = e6.r, t2._swe_set_topo = e6.s, t2._swe_deltat_ex = e6.t, t2._swe_calc = e6.u, t2._swe_fixstar = e6.v, t2._swe_azalt = e6.w, t2._swe_pheno_ut = e6.x, t2._swe_fixstar_mag = e6.y, t2._swe_topo_arcus_visionis = e6.z, t2._swe_heliacal_angle = e6.A, t2._swe_heliacal_pheno_ut = e6.B, t2._swe_heliacal_ut = e6.C, t2._swe_get_planet_name = e6.D, t2._swe_rise_trans = e6.E, t2._swe_calc_ut = e6.F, t2._swe_houses = e6.G, t2._swe_sidtime0 = e6.H, t2._swe_houses_armc_ex2 = e6.I, t2._swe_difdeg2n = e6.J, t2._swe_houses_ex = e6.K, t2._swe_houses_ex2 = e6.L, t2._swe_set_sid_mode = e6.M, t2._swe_get_ayanamsa_ex = e6.N, t2._swe_houses_armc = e6.O, t2._swe_cotrans = e6.P, t2._swe_radnorm = e6.Q, t2._swe_house_name = e6.R, t2._swe_house_pos = e6.S, t2._swe_sol_eclipse_where = e6.T, t2._swe_sidtime = e6.U, t2._swe_refrac_extended = e6.V, t2._swe_lun_occult_where = e6.W, t2._swe_sol_eclipse_how = e6.X, t2._swe_sol_eclipse_when_glob = e6.Y, t2._swe_lun_occult_when_glob = e6.Z, t2._swe_sol_eclipse_when_loc = e6._, t2._swe_lun_occult_when_loc = e6.$, t2._swe_azalt_rev = e6.aa, t2._swe_refrac = e6.ba, t2._swe_set_lapse_rate = e6.ca, t2._swe_lun_eclipse_how = e6.da, t2._swe_lun_eclipse_when = e6.ea, t2._swe_lun_eclipse_when_loc = e6.fa, t2._swe_rise_trans_true_hor = e6.ga, t2._swe_pheno = e6.ha, t2._swe_nod_aps = e6.ia, t2._swe_nod_aps_ut = e6.ja, t2._swe_get_orbital_elements = e6.ka, t2._swe_orbit_max_min_true_distance = e6.la, t2._swe_gauquelin_sector = e6.ma, t2._swe_version = e6.na, t2._swe_get_library_path = e6.oa, t2._swe_set_tid_acc = e6.pa, t2._free = e6.qa, t2._swe_set_ephe_path = e6.ra, t2._swe_difrad2n = e6.sa, t2._swe_close = e6.ta, t2._swe_set_jpl_file = e6.ua, t2._swe_get_ayanamsa_ex_ut = e6.va, t2._swe_get_ayanamsa = e6.wa, t2._swe_get_ayanamsa_ut = e6.xa, t2._swe_fixstar2 = e6.ya, t2._swe_fixstar2_ut = e6.za, t2._swe_fixstar2_mag = e6.Aa, t2._malloc = e6.Ba, t2._swe_get_ayanamsa_name = e6.Ca, t2._swe_time_equ = e6.Da, t2._swe_lmt_to_lat = e6.Ea, t2._swe_lat_to_lmt = e6.Fa, t2._swe_fixstar_ut = e6.Ga, t2._swe_calc_pctr = e6.Ha, t2._swe_get_current_file_data = e6.Ia, t2._swe_solcross = e6.Ja, t2._swe_solcross_ut = e6.Ka, t2._swe_mooncross = e6.La, t2._swe_mooncross_ut = e6.Ma, t2._swe_mooncross_node = e6.Na, t2._swe_mooncross_node_ut = e6.Oa, t2._swe_helio_cross = e6.Pa, t2._swe_helio_cross_ut = e6.Qa, t2._swe_date_conversion = e6.Ra, t2._swe_julday = e6.Sa, t2._swe_utc_time_zone = e6.Ta, t2._swe_utc_to_jd = e6.Ua, t2._swe_jdet_to_utc = e6.Va, t2._swe_jdut1_to_utc = e6.Wa, t2._swe_deg_midp = e6.Xa, t2._swe_rad_midp = e6.Ya, t2._swe_cotrans_sp = e6.Za, t2._swe_deltat = e6._a, t2._swe_get_tid_acc = e6.$a, t2._swe_set_delta_t_userdef = e6.ab, t2._swe_set_interpolate_nut = e6.bb, t2._swe_csnorm = e6.cb, t2._swe_difcsn = e6.db, t2._swe_difdegn = e6.eb, t2._swe_difcs2n = e6.fb, t2._swe_csroundsec = e6.gb, t2._swe_d2l = e6.hb, t2._swe_day_of_week = e6.ib, t2._swe_cs2timestr = e6.jb, t2._swe_cs2lonlatstr = e6.kb, t2._swe_cs2degstr = e6.lb, t2._swe_split_deg = e6.mb, t2._swe_set_astro_models = e6.nb, t2._swe_get_astro_models = e6.ob, ce = e6.pb, me = e6.qb, fe = e6.rb, _e = e6.sb;
      })(we), we;
    }
    var r3 = { a: he };
    return t2.instantiateWasm ? new Promise((o3, n3) => {
      t2.instantiateWasm(r3, (r4, t3) => {
        o3(e4(r4));
      });
    }) : (S2 ??= P(), (function(r4) {
      return e4(r4.instance);
    })(await N(s2, S2, r3)));
  })(), (function e4() {
    function r3() {
      t2.calledRun = true, y || (F = true, E2(), t2.noFSInit || oe.initialized || oe.init(), we.o(), oe.ignorePermissions = false, i2?.(t2), t2.onRuntimeInitialized?.(), (function() {
        if (E2(), t2.postRun) for ("function" == typeof t2.postRun && (t2.postRun = [t2.postRun]); t2.postRun.length; ) C(t2.postRun.shift());
        B(R);
      })());
    }
    Z > 0 ? ee = e4 : (pe(), (function() {
      if (t2.preRun) for ("function" == typeof t2.preRun && (t2.preRun = [t2.preRun]); t2.preRun.length; ) z(t2.preRun.shift());
      B(j);
    })(), Z > 0 ? ee = e4 : (t2.setStatus ? (t2.setStatus("Running..."), setTimeout(() => {
      setTimeout(() => t2.setStatus(""), 1), r3();
    }, 1)) : r3(), E2()));
  })(), F ? t2 : new Promise((e4, r3) => {
    i2 = e4, l2 = r3;
  });
}
var init_swisseph = __esm({
  "vendor-src/sweph/wasm/swisseph.js"() {
  }
});

// vendor-src/sweph/index.js
function e2(e3, t2, s2) {
  const _2 = e3.slice(0, t2);
  for (; _2.length < t2; ) _2.push(s2 ?? null);
  return _2;
}
function t(e3) {
  return e3 < 0 ? `${Math.abs(e3)} BC` : 0 === e3 ? "1 BC" : `${e3} AD`;
}
var s = (function() {
  const e3 = [];
  let s2 = -5401;
  const _2 = [{ prefix: "pl", category: "SE Planetary Ephemeris" }, { prefix: "mo", category: "SE Moon Ephemeris" }, { prefix: "as", category: "SE Asteroid Ephemeris" }];
  for (; s2 < 5400; ) {
    let r2 = s2 + 599;
    s2 <= 0 && r2 >= 0 && (s2 += 1, r2 += 1);
    const a2 = String(Math.floor(Math.abs(s2) / 100)).padStart(2, "0"), E2 = r2 < 0 ? "m" : "_";
    for (const i2 of _2) e3.push({ name: `se${i2.prefix}${E2}${a2}.se1`, desc: `${t(s2)} - ${t(r2)}`, category: i2.category });
    s2 += 600;
  }
  return e3.sort((e4, t2) => {
    const s3 = e4.category.localeCompare(t2.category);
    return 0 !== s3 ? s3 : e4.name.localeCompare(t2.name);
  }), e3;
})().concat([{ name: "de200.eph", desc: "1599 AD - 2169 AD", category: "JPL Ephemeris" }, { name: "de403.eph", desc: "3000 BC - 3000 AD", category: "JPL Ephemeris" }, { name: "de404.eph", desc: "3000 BC - 3000 AD", category: "JPL Ephemeris" }, { name: "de405.eph", desc: "1600 AD - 2200 AD", category: "JPL Ephemeris" }, { name: "de406.eph", desc: "3000 BC - 3000 AD", category: "JPL Ephemeris" }, { name: "de431.eph", desc: "13201 BC - 17191 AD", category: "JPL Ephemeris" }], [{ name: "fixstars.cat", desc: "Static", category: "Fixed Stars Catalog" }, { name: "sefstars.txt", desc: "Static", category: "Fixed Stars Names" }, { name: "seasnam.txt", desc: "Static", category: "Asteroid Names" }, { name: "seorbel.txt", desc: "Epoch-based (varies)", category: "Orbital Elements (Asteroids)" }]);
var _ = class __ extends Error {
  flag;
  error;
  constructor(e3, t2) {
    super(e3), this.error = e3, this.name = "SweError", this.flag = t2, Object.setPrototypeOf(this, __.prototype);
  }
};
var r = Object.defineProperty;
var a = (e3, t2, s2) => ((e4, t3, s3) => t3 in e4 ? r(e4, t3, { enumerable: true, configurable: true, writable: true, value: s3 }) : e4[t3] = s3)(e3, "symbol" != typeof t2 ? t2 + "" : t2, s2);
var E = { i8: Int8Array.BYTES_PER_ELEMENT, i16: Int16Array.BYTES_PER_ELEMENT, i32: Int32Array.BYTES_PER_ELEMENT, i64: BigInt64Array.BYTES_PER_ELEMENT, float: Float32Array.BYTES_PER_ELEMENT, double: Float64Array.BYTES_PER_ELEMENT };
var i = class {
  constructor(e3, t2) {
    a(this, "_ptr", 0), a(this, "wasm"), this.wasm = e3, this._ptr = t2;
  }
  get ptr() {
    return this._ptr;
  }
  get isValid() {
    return 0 !== this._ptr;
  }
  validatePointer() {
    if (!this.isValid) throw new Error("Cannot operate on freed or invalid pointer");
  }
  free() {
    0 !== this._ptr && (this.wasm._free(this._ptr), this._ptr = 0);
  }
  readAndFree() {
    this.validatePointer();
    const e3 = this.read();
    return this.free(), e3;
  }
  toString() {
    return `${this.constructor.name}(ptr=${this._ptr}, valid=${this.isValid})`;
  }
};
var o = class _o extends i {
  constructor(e3, t2, s2, _2) {
    super(e3, _2 ?? e3._malloc(s2 * E[t2])), a(this, "type"), a(this, "length"), this.type = t2, this.length = s2;
  }
  static from(e3, t2, s2, _2 = []) {
    const r2 = _o.alloc(e3, t2, s2);
    return r2.write(_2), r2;
  }
  static alloc(e3, t2, s2) {
    return new _o(e3, t2, s2);
  }
  add(e3, t2) {
    if (this.validatePointer(), !(e3 >= 0 && e3 < this.length)) throw new Error(`Out-of-bounds access: tried to write at index ${e3} in array of length ${this.length}`);
    this.wasm.setValue(this.ptr + e3 * E[this.type], t2, this.type);
  }
  read() {
    this.validatePointer();
    const e3 = E[this.type];
    return (function(e4, t2) {
      const s2 = e4.slice(0, t2);
      for (; s2.length < t2; ) s2.push(null);
      return s2;
    })(Array.from({ length: this.length }, (t2, s2) => this.wasm.getValue(this.ptr + s2 * e3, this.type)), this.length);
  }
  write(e3) {
    if (this.validatePointer(), e3.length > this.length) throw new Error(`Array length mismatch. Expected ${this.length}, got ${e3.length}`);
    e3.forEach((e4, t2) => this.add(t2, e4));
  }
};
var h = class {
  static boolToC(e3) {
    return e3 ? 1 : 0;
  }
  static boolFromC(e3) {
    return !!e3;
  }
  static charToC(e3) {
    if ("string" != typeof e3 || 1 !== e3.length) throw new Error("Input must be exactly one character");
    const t2 = e3.charCodeAt(0);
    if (t2 < 0 || t2 > 255) throw new Error(`Character '${e3}' is outside ASCII range (0-255)`);
    return t2;
  }
  static charFromC(e3) {
    if (!Number.isInteger(e3) || e3 < 0 || e3 > 255) throw new Error(`Invalid ASCII code: ${e3}. Must be 0-255`);
    return String.fromCharCode(e3);
  }
  static validateNumberType(e3) {
    if (!(e3 in E)) throw new Error(`Unsupported number type: ${e3}`);
    return true;
  }
  static getTypeSize(e3) {
    return this.validateNumberType(e3), E[e3];
  }
};
var n = class extends i {
  constructor() {
    super({}, 0);
  }
  read() {
    throw new Error("Cannot read from a NullPointer");
  }
};
var S = class _S extends i {
  constructor(e3, t2, s2) {
    super(e3, s2 ?? e3._malloc(E[t2])), a(this, "type"), this.type = t2;
  }
  static from(e3, t2, s2) {
    const _2 = _S.alloc(e3, t2);
    return _2.write(s2), _2;
  }
  write(e3) {
    this.validatePointer(), this.add(e3);
  }
  static alloc(e3, t2) {
    return new _S(e3, t2);
  }
  add(e3) {
    this.validatePointer(), this.wasm.setValue(this.ptr, e3, this.type);
  }
  read() {
    return this.validatePointer(), this.wasm.getValue(this.ptr, this.type);
  }
};
var l = class _l extends i {
  constructor(e3, t2, s2) {
    super(e3, s2 ?? e3._malloc(t2 * E.i8)), a(this, "length"), this.length = t2;
  }
  static from(e3, t2, s2 = "") {
    const _2 = _l.alloc(e3, t2 + 1);
    return _2.write(s2), _2;
  }
  static alloc(e3, t2) {
    return new _l(e3, t2);
  }
  write(e3) {
    if (this.validatePointer(), e3.length + 1 > this.length) throw new Error("String length exceeds buffer size");
    this.wasm.stringToUTF8(e3, this.ptr, this.length);
  }
  read() {
    return this.validatePointer(), this.wasm.UTF8ToString(this.ptr, this.length);
  }
};
var A = class _A {
  TRUE = 1;
  FALSE = 0;
  OK = 0;
  ERR = -1;
  NOT_AVAILABLE = -2;
  BEYOND_EPH_LIMITS = -3;
  ODEGREE_STRING = "\xB0";
  HUGE = 17e307;
  M_PI = Math.PI;
  AS_MAXCH = 256;
  RADTODEG = 180 / this.M_PI;
  DEGTORAD = this.M_PI / 180;
  DEG = 36e4;
  DEG7_30 = 27e5;
  DEG15 = 15 * this.DEG;
  DEG24 = 24 * this.DEG;
  DEG30 = 30 * this.DEG;
  DEG60 = 60 * this.DEG;
  DEG90 = 90 * this.DEG;
  DEG120 = 120 * this.DEG;
  DEG150 = 150 * this.DEG;
  DEG180 = 180 * this.DEG;
  DEG270 = 270 * this.DEG;
  DEG360 = 360 * this.DEG;
  CSTORAD = this.DEGTORAD / 36e4;
  RADTOCS = 36e4 * this.RADTODEG;
  CS2DEG = 1 / 36e4;
  BFILE_R_ACCESS = "rb";
  BFILE_RW_ACCESS = "r+b";
  BFILE_W_CREATE = "wb";
  BFILE_A_ACCESS = "a+b";
  PATH_SEPARATOR = ";";
  OPEN_MODE = "0666";
  FILE_R_ACCESS = "rt";
  FILE_RW_ACCESS = "r+t";
  FILE_W_CREATE = "wt";
  FILE_A_ACCESS = "a+t";
  DIR_GLUE = "\\";
  SE_AUNIT_TO_KM = 1495978707e-1;
  SE_AUNIT_TO_LIGHTYEAR = 1 / 63241.07708427;
  SE_AUNIT_TO_PARSEC = 1 / 206264.8062471;
  SE_JUL_CAL = 0;
  SE_GREG_CAL = 1;
  SE_ECL_NUT = -1;
  SE_SUN = 0;
  SE_MOON = 1;
  SE_MERCURY = 2;
  SE_VENUS = 3;
  SE_MARS = 4;
  SE_JUPITER = 5;
  SE_SATURN = 6;
  SE_URANUS = 7;
  SE_NEPTUNE = 8;
  SE_PLUTO = 9;
  SE_MEAN_NODE = 10;
  SE_TRUE_NODE = 11;
  SE_MEAN_APOG = 12;
  SE_OSCU_APOG = 13;
  SE_EARTH = 14;
  SE_CHIRON = 15;
  SE_PHOLUS = 16;
  SE_CERES = 17;
  SE_PALLAS = 18;
  SE_JUNO = 19;
  SE_VESTA = 20;
  SE_INTP_APOG = 21;
  SE_INTP_PERG = 22;
  SE_NPLANETS = 23;
  SE_PLMOON_OFFSET = 9e3;
  SE_AST_OFFSET = 1e4;
  SE_VARUNA = this.SE_AST_OFFSET + 2e4;
  SE_FICT_OFFSET = 40;
  SE_FICT_OFFSET_1 = 39;
  SE_FICT_MAX = 999;
  SE_NFICT_ELEM = 15;
  SE_COMET_OFFSET = 1e3;
  SE_NALL_NAT_POINTS = this.SE_NPLANETS + this.SE_NFICT_ELEM;
  SE_CUPIDO = 40;
  SE_HADES = 41;
  SE_ZEUS = 42;
  SE_KRONOS = 43;
  SE_APOLLON = 44;
  SE_ADMETOS = 45;
  SE_VULKANUS = 46;
  SE_POSEIDON = 47;
  SE_ISIS = 48;
  SE_NIBIRU = 49;
  SE_HARRINGTON = 50;
  SE_NEPTUNE_LEVERRIER = 51;
  SE_NEPTUNE_ADAMS = 52;
  SE_PLUTO_LOWELL = 53;
  SE_PLUTO_PICKERING = 54;
  SE_VULCAN = 55;
  SE_WHITE_MOON = 56;
  SE_PROSERPINA = 57;
  SE_WALDEMATH = 58;
  SE_FIXSTAR = -10;
  SE_ASC = 0;
  SE_MC = 1;
  SE_ARMC = 2;
  SE_VERTEX = 3;
  SE_EQUASC = 4;
  SE_COASC1 = 5;
  SE_COASC2 = 6;
  SE_POLASC = 7;
  SE_NASCMC = 8;
  SEFLG_JPLEPH = 1;
  SEFLG_SWIEPH = 2;
  SEFLG_MOSEPH = 4;
  SEFLG_HELCTR = 8;
  SEFLG_TRUEPOS = 16;
  SEFLG_J2000 = 32;
  SEFLG_NONUT = 64;
  SEFLG_SPEED3 = 128;
  SEFLG_SPEED = 256;
  SEFLG_NOGDEFL = 512;
  SEFLG_NOABERR = 1024;
  SEFLG_ASTROMETRIC = this.SEFLG_NOABERR | this.SEFLG_NOGDEFL;
  SEFLG_EQUATORIAL = 2048;
  SEFLG_XYZ = 4096;
  SEFLG_RADIANS = 8192;
  SEFLG_BARYCTR = 16384;
  SEFLG_TOPOCTR = 32768;
  SEFLG_ORBEL_AA = this.SEFLG_TOPOCTR;
  SEFLG_TROPICAL = 0;
  SEFLG_SIDEREAL = 65536;
  SEFLG_ICRS = 131072;
  SEFLG_DPSIDEPS_1980 = 262144;
  SEFLG_JPLHOR = this.SEFLG_DPSIDEPS_1980;
  SEFLG_JPLHOR_APPROX = 524288;
  SEFLG_CENTER_BODY = 1048576;
  SEFLG_TEST_PLMOON = 2097152 | this.SEFLG_J2000 | this.SEFLG_ICRS | this.SEFLG_HELCTR | this.SEFLG_TRUEPOS;
  SE_SIDBITS = 256;
  SE_SIDBIT_ECL_T0 = 256;
  SE_SIDBIT_SSY_PLANE = 512;
  SE_SIDBIT_USER_UT = 1024;
  SE_SIDBIT_ECL_DATE = 2048;
  SE_SIDBIT_NO_PREC_OFFSET = 4096;
  SE_SIDBIT_PREC_ORIG = 8192;
  SE_SIDM_FAGAN_BRADLEY = 0;
  SE_SIDM_LAHIRI = 1;
  SE_SIDM_DELUCE = 2;
  SE_SIDM_RAMAN = 3;
  SE_SIDM_USHASHASHI = 4;
  SE_SIDM_KRISHNAMURTI = 5;
  SE_SIDM_DJWHAL_KHUL = 6;
  SE_SIDM_YUKTESHWAR = 7;
  SE_SIDM_JN_BHASIN = 8;
  SE_SIDM_BABYL_KUGLER1 = 9;
  SE_SIDM_BABYL_KUGLER2 = 10;
  SE_SIDM_BABYL_KUGLER3 = 11;
  SE_SIDM_BABYL_HUBER = 12;
  SE_SIDM_BABYL_ETPSC = 13;
  SE_SIDM_ALDEBARAN_15TAU = 14;
  SE_SIDM_HIPPARCHOS = 15;
  SE_SIDM_SASSANIAN = 16;
  SE_SIDM_GALCENT_0SAG = 17;
  SE_SIDM_J2000 = 18;
  SE_SIDM_J1900 = 19;
  SE_SIDM_B1950 = 20;
  SE_SIDM_SURYASIDDHANTA = 21;
  SE_SIDM_SURYASIDDHANTA_MSUN = 22;
  SE_SIDM_ARYABHATA = 23;
  SE_SIDM_ARYABHATA_MSUN = 24;
  SE_SIDM_SS_REVATI = 25;
  SE_SIDM_SS_CITRA = 26;
  SE_SIDM_TRUE_CITRA = 27;
  SE_SIDM_TRUE_REVATI = 28;
  SE_SIDM_TRUE_PUSHYA = 29;
  SE_SIDM_GALCENT_RGILBRAND = 30;
  SE_SIDM_GALEQU_IAU1958 = 31;
  SE_SIDM_GALEQU_TRUE = 32;
  SE_SIDM_GALEQU_MULA = 33;
  SE_SIDM_GALALIGN_MARDYKS = 34;
  SE_SIDM_TRUE_MULA = 35;
  SE_SIDM_GALCENT_MULA_WILHELM = 36;
  SE_SIDM_ARYABHATA_522 = 37;
  SE_SIDM_BABYL_BRITTON = 38;
  SE_SIDM_TRUE_SHEORAN = 39;
  SE_SIDM_GALCENT_COCHRANE = 40;
  SE_SIDM_GALEQU_FIORENZA = 41;
  SE_SIDM_VALENS_MOON = 42;
  SE_SIDM_LAHIRI_1940 = 43;
  SE_SIDM_LAHIRI_VP285 = 44;
  SE_SIDM_KRISHNAMURTI_VP291 = 45;
  SE_SIDM_LAHIRI_ICRC = 46;
  SE_SIDM_USER = 255;
  SE_NSIDM_PREDEF = 47;
  SE_NODBIT_MEAN = 1;
  SE_NODBIT_OSCU = 2;
  SE_NODBIT_OSCU_BAR = 4;
  SE_NODBIT_FOPOINT = 256;
  SEFLG_DEFAULTEPH = this.SEFLG_SWIEPH;
  SE_MAX_STNAME = 256;
  SE_ECL_CENTRAL = 1;
  SE_ECL_NONCENTRAL = 2;
  SE_ECL_TOTAL = 4;
  SE_ECL_ANNULAR = 8;
  SE_ECL_PARTIAL = 16;
  SE_ECL_ANNULAR_TOTAL = 32;
  SE_ECL_HYBRID = 32;
  SE_ECL_PENUMBRAL = 64;
  SE_ECL_ALLTYPES_SOLAR = this.SE_ECL_CENTRAL | this.SE_ECL_NONCENTRAL | this.SE_ECL_TOTAL | this.SE_ECL_ANNULAR | this.SE_ECL_PARTIAL | this.SE_ECL_ANNULAR_TOTAL;
  SE_ECL_ALLTYPES_LUNAR = this.SE_ECL_TOTAL | this.SE_ECL_PARTIAL | this.SE_ECL_PENUMBRAL;
  SE_ECL_VISIBLE = 128;
  SE_ECL_MAX_VISIBLE = 256;
  SE_ECL_1ST_VISIBLE = 512;
  SE_ECL_PARTBEG_VISIBLE = 512;
  SE_ECL_2ND_VISIBLE = 1024;
  SE_ECL_TOTBEG_VISIBLE = 1024;
  SE_ECL_3RD_VISIBLE = 2048;
  SE_ECL_TOTEND_VISIBLE = 2048;
  SE_ECL_4TH_VISIBLE = 4096;
  SE_ECL_PARTEND_VISIBLE = 4096;
  SE_ECL_PENUMBBEG_VISIBLE = 8192;
  SE_ECL_PENUMBEND_VISIBLE = 16384;
  SE_ECL_OCC_BEG_DAYLIGHT = 8192;
  SE_ECL_OCC_END_DAYLIGHT = 16384;
  SE_ECL_ONE_TRY = 32768;
  SE_CALC_RISE = 1;
  SE_CALC_SET = 2;
  SE_CALC_MTRANSIT = 4;
  SE_CALC_ITRANSIT = 8;
  SE_BIT_DISC_CENTER = 256;
  SE_BIT_DISC_BOTTOM = 8192;
  SE_BIT_GEOCTR_NO_ECL_LAT = 128;
  SE_BIT_NO_REFRACTION = 512;
  SE_BIT_CIVIL_TWILIGHT = 1024;
  SE_BIT_NAUTIC_TWILIGHT = 2048;
  SE_BIT_ASTRO_TWILIGHT = 4096;
  SE_BIT_FIXED_DISC_SIZE = 16384;
  SE_BIT_FORCE_SLOW_METHOD = 32768;
  SE_BIT_HINDU_RISING = this.SE_BIT_DISC_CENTER | this.SE_BIT_NO_REFRACTION | this.SE_BIT_GEOCTR_NO_ECL_LAT;
  SE_ECL2HOR = 0;
  SE_EQU2HOR = 1;
  SE_HOR2ECL = 0;
  SE_HOR2EQU = 1;
  SE_TRUE_TO_APP = 0;
  SE_APP_TO_TRUE = 1;
  SE_DE_NUMBER = 431;
  SE_FNAME_DE200 = "de200.eph";
  SE_FNAME_DE403 = "de403.eph";
  SE_FNAME_DE404 = "de404.eph";
  SE_FNAME_DE405 = "de405.eph";
  SE_FNAME_DE406 = "de406.eph";
  SE_FNAME_DE431 = "de431.eph";
  SE_FNAME_DFT = this.SE_FNAME_DE431;
  SE_FNAME_DFT2 = this.SE_FNAME_DE406;
  SE_STARFILE_OLD = "fixstars.cat";
  SE_STARFILE = "sefstars.txt";
  SE_ASTNAMFILE = "seasnam.txt";
  SE_FICTFILE = "seorbel.txt";
  SE_SPLIT_DEG_ROUND_SEC = 1;
  SE_SPLIT_DEG_ROUND_MIN = 2;
  SE_SPLIT_DEG_ROUND_DEG = 4;
  SE_SPLIT_DEG_ZODIACAL = 8;
  SE_SPLIT_DEG_NAKSHATRA = 1024;
  SE_SPLIT_DEG_KEEP_SIGN = 16;
  SE_SPLIT_DEG_KEEP_DEG = 32;
  SE_HELIACAL_RISING = 1;
  SE_HELIACAL_SETTING = 2;
  SE_MORNING_FIRST = this.SE_HELIACAL_RISING;
  SE_EVENING_LAST = this.SE_HELIACAL_SETTING;
  SE_EVENING_FIRST = 3;
  SE_MORNING_LAST = 4;
  SE_ACRONYCHAL_RISING = 5;
  SE_ACRONYCHAL_SETTING = 6;
  SE_COSMICAL_SETTING = this.SE_ACRONYCHAL_SETTING;
  SE_HELFLAG_LONG_SEARCH = 128;
  SE_HELFLAG_HIGH_PRECISION = 256;
  SE_HELFLAG_OPTICAL_PARAMS = 512;
  SE_HELFLAG_NO_DETAILS = 1024;
  SE_HELFLAG_SEARCH_1_PERIOD = 2048;
  SE_HELFLAG_VISLIM_DARK = 4096;
  SE_HELFLAG_VISLIM_NOMOON = 8192;
  SE_HELFLAG_VISLIM_PHOTOPIC = 16384;
  SE_HELFLAG_VISLIM_SCOTOPIC = 32768;
  SE_HELFLAG_AV = 65536;
  SE_HELFLAG_AVKIND_VR = 65536;
  SE_HELFLAG_AVKIND_PTO = 1 << 17;
  SE_HELFLAG_AVKIND_MIN7 = 1 << 18;
  SE_HELFLAG_AVKIND_MIN9 = 1 << 19;
  SE_HELFLAG_AVKIND = this.SE_HELFLAG_AVKIND_VR | this.SE_HELFLAG_AVKIND_PTO | this.SE_HELFLAG_AVKIND_MIN7 | this.SE_HELFLAG_AVKIND_MIN9;
  TJD_INVALID = 99999999;
  SIMULATE_VICTORVB = 1;
  SE_HELIACAL_LONG_SEARCH = 128;
  SE_HELIACAL_HIGH_PRECISION = 256;
  SE_HELIACAL_OPTICAL_PARAMS = 512;
  SE_HELIACAL_NO_DETAILS = 1024;
  SE_HELIACAL_SEARCH_1_PERIOD = 2048;
  SE_HELIACAL_VISLIM_DARK = 4096;
  SE_HELIACAL_VISLIM_NOMOON = 8192;
  SE_HELIACAL_VISLIM_PHOTOPIC = 16384;
  SE_HELIACAL_AVKIND_VR = 32768;
  SE_HELIACAL_AVKIND_PTO = 65536;
  SE_HELIACAL_AVKIND_MIN7 = 1 << 17;
  SE_HELIACAL_AVKIND_MIN9 = 1 << 18;
  SE_HELIACAL_AVKIND = this.SE_HELFLAG_AVKIND_VR | this.SE_HELFLAG_AVKIND_PTO | this.SE_HELFLAG_AVKIND_MIN7 | this.SE_HELFLAG_AVKIND_MIN9;
  SE_PHOTOPIC_FLAG = 0;
  SE_SCOTOPIC_FLAG = 1;
  SE_MIXEDOPIC_FLAG = 2;
  SE_TIDAL_DE200 = -23.8946;
  SE_TIDAL_DE403 = -25.58;
  SE_TIDAL_DE404 = -25.58;
  SE_TIDAL_DE405 = -25.826;
  SE_TIDAL_DE406 = -25.826;
  SE_TIDAL_DE421 = -25.85;
  SE_TIDAL_DE422 = -25.85;
  SE_TIDAL_DE430 = -25.82;
  SE_TIDAL_DE431 = -25.8;
  SE_TIDAL_DE441 = -25.936;
  SE_TIDAL_26 = -26;
  SE_TIDAL_STEPHENSON_2016 = -25.85;
  SE_TIDAL_DEFAULT = this.SE_TIDAL_DE431;
  SE_TIDAL_AUTOMATIC = 999999;
  SE_TIDAL_MOSEPH = this.SE_TIDAL_DE404;
  SE_TIDAL_SWIEPH = this.SE_TIDAL_DEFAULT;
  SE_TIDAL_JPLEPH = this.SE_TIDAL_DEFAULT;
  SE_DELTAT_AUTOMATIC = -1e-10;
  SE_MODEL_DELTAT = 0;
  SE_MODEL_PREC_LONGTERM = 1;
  SE_MODEL_PREC_SHORTTERM = 2;
  SE_MODEL_NUT = 3;
  SE_MODEL_BIAS = 4;
  SE_MODEL_JPLHOR_MODE = 5;
  SE_MODEL_JPLHORA_MODE = 6;
  SE_MODEL_SIDT = 7;
  NSE_MODELS = 8;
  SEMOD_NPREC = 11;
  SEMOD_PREC_IAU_1976 = 1;
  SEMOD_PREC_LASKAR_1986 = 2;
  SEMOD_PREC_WILL_EPS_LASK = 3;
  SEMOD_PREC_WILLIAMS_1994 = 4;
  SEMOD_PREC_SIMON_1994 = 5;
  SEMOD_PREC_IAU_2000 = 6;
  SEMOD_PREC_BRETAGNON_2003 = 7;
  SEMOD_PREC_IAU_2006 = 8;
  SEMOD_PREC_VONDRAK_2011 = 9;
  SEMOD_PREC_OWEN_1990 = 10;
  SEMOD_PREC_NEWCOMB = 11;
  SEMOD_PREC_DEFAULT = this.SEMOD_PREC_VONDRAK_2011;
  SEMOD_PREC_DEFAULT_SHORT = this.SEMOD_PREC_VONDRAK_2011;
  SEMOD_NNUT = 5;
  SEMOD_NUT_IAU_1980 = 1;
  SEMOD_NUT_IAU_CORR_1987 = 2;
  SEMOD_NUT_IAU_2000A = 3;
  SEMOD_NUT_IAU_2000B = 4;
  SEMOD_NUT_WOOLARD = 5;
  SEMOD_NUT_DEFAULT = this.SEMOD_NUT_IAU_2000B;
  SEMOD_NSIDT = 4;
  SEMOD_SIDT_IAU_1976 = 1;
  SEMOD_SIDT_IAU_2006 = 2;
  SEMOD_SIDT_IERS_CONV_2010 = 3;
  SEMOD_SIDT_LONGTERM = 4;
  SEMOD_SIDT_DEFAULT = this.SEMOD_SIDT_LONGTERM;
  SEMOD_NBIAS = 3;
  SEMOD_BIAS_NONE = 1;
  SEMOD_BIAS_IAU2000 = 2;
  SEMOD_BIAS_IAU2006 = 3;
  SEMOD_BIAS_DEFAULT = this.SEMOD_BIAS_IAU2006;
  SEMOD_NJPLHOR = 2;
  SEMOD_JPLHOR_LONG_AGREEMENT = 1;
  SEMOD_JPLHOR_DEFAULT = this.SEMOD_JPLHOR_LONG_AGREEMENT;
  SEMOD_NJPLHORA = 3;
  SEMOD_JPLHORA_1 = 1;
  SEMOD_JPLHORA_2 = 2;
  SEMOD_JPLHORA_3 = 3;
  SEMOD_JPLHORA_DEFAULT = this.SEMOD_JPLHORA_3;
  SEMOD_NDELTAT = 5;
  SEMOD_DELTAT_STEPHENSON_MORRISON_1984 = 1;
  SEMOD_DELTAT_STEPHENSON_1997 = 2;
  SEMOD_DELTAT_STEPHENSON_MORRISON_2004 = 3;
  SEMOD_DELTAT_ESPENAK_MEEUS_2006 = 4;
  SEMOD_DELTAT_STEPHENSON_ETC_2016 = 5;
  SEMOD_DELTAT_DEFAULT = this.SEMOD_DELTAT_STEPHENSON_ETC_2016;
  wasm;
  constructor(e3) {
    this.wasm = e3;
  }
  static async init(e3) {
    const { default: t2 } = await Promise.resolve().then(() => (init_swisseph(), swisseph_exports)), s2 = await t2({ locateFile: (t3, s3) => t3.endsWith("swisseph.wasm") ? e3 || new URL("wasm/swisseph.wasm", import.meta.url).href : s3 + t3 });
    return new _A(s2);
  }
  swe_azalt_rev(e3, t2, s2, _2) {
    const r2 = o.from(this.wasm, "double", 3, s2), a2 = o.from(this.wasm, "double", 2, _2), E2 = o.alloc(this.wasm, "double", 2);
    return this.wasm._swe_azalt_rev(e3, t2, r2.ptr, a2.ptr, E2.ptr), a2.free(), r2.free(), E2.readAndFree();
  }
  swe_azalt(e3, t2, s2, _2, r2, a2) {
    const E2 = o.from(this.wasm, "double", 3, s2), i2 = o.from(this.wasm, "double", 3, a2), h2 = o.alloc(this.wasm, "double", 3);
    return this.wasm._swe_azalt(e3, t2, E2.ptr, _2, r2, i2.ptr, h2.ptr), E2.free(), i2.free(), h2.readAndFree();
  }
  swe_calc_pctr(e3, t2, s2, r2) {
    const a2 = o.alloc(this.wasm, "double", 6), E2 = l.alloc(this.wasm, this.AS_MAXCH), i2 = this.wasm._swe_calc_pctr(e3, t2, s2, r2, a2.ptr, E2.ptr), h2 = E2.readAndFree();
    if (i2 < this.OK) throw new _(h2, i2);
    return a2.readAndFree();
  }
  swe_calc_ut(e3, t2, s2) {
    const r2 = o.alloc(this.wasm, "double", 6), a2 = l.alloc(this.wasm, this.AS_MAXCH), E2 = this.wasm._swe_calc_ut(e3, t2, s2, r2.ptr, a2.ptr);
    if (E2 < this.OK) throw new _(a2.readAndFree(), E2);
    return r2.readAndFree();
  }
  swe_calc(e3, t2, s2) {
    const r2 = o.alloc(this.wasm, "double", 6), a2 = l.alloc(this.wasm, this.AS_MAXCH), E2 = this.wasm._swe_calc(e3, t2, s2, r2.ptr, a2.ptr);
    if (E2 < this.OK) throw new _(a2.readAndFree(), E2);
    return r2.readAndFree();
  }
  swe_close() {
    this.wasm._swe_close();
  }
  swe_cotrans_sp(e3, t2) {
    const s2 = o.from(this.wasm, "double", 6, e3), _2 = o.alloc(this.wasm, "double", 6);
    return this.wasm._swe_cotrans_sp(s2.ptr, _2.ptr, t2), s2.free(), _2.readAndFree();
  }
  swe_cotrans(e3, t2) {
    const s2 = o.from(this.wasm, "double", 3, e3), _2 = o.alloc(this.wasm, "double", 3);
    return this.wasm._swe_cotrans(s2.ptr, _2.ptr, t2), s2.free(), _2.readAndFree();
  }
  swe_cs2degstr(e3) {
    const t2 = l.alloc(this.wasm, this.AS_MAXCH);
    return this.wasm._swe_cs2degstr(e3, t2.ptr), t2.readAndFree();
  }
  swe_cs2lonlatstr(e3, t2, s2) {
    const _2 = l.alloc(this.wasm, this.AS_MAXCH);
    return this.wasm._swe_cs2lonlatstr(e3, h.charToC(t2), h.charToC(s2), _2.ptr), _2.readAndFree();
  }
  swe_cs2timestr(e3, t2, s2) {
    const _2 = l.alloc(this.wasm, this.AS_MAXCH);
    return this.wasm._swe_cs2lonlatstr(e3, h.charToC(t2), h.boolToC(s2), _2.ptr), _2.readAndFree();
  }
  swe_csnorm(e3) {
    return this.wasm._swe_csnorm(e3);
  }
  swe_csroundsec(e3) {
    return this.wasm._swe_csroundsec(e3);
  }
  swe_d2l(e3) {
    return this.wasm._swe_d2l(e3);
  }
  swe_date_conversion(e3, t2, s2, r2, a2 = "j") {
    const E2 = S.alloc(this.wasm, "double"), i2 = this.wasm._swe_date_conversion(e3, t2, s2, r2, h.charToC(a2), E2.ptr);
    if (i2 < this.OK) throw new _("illegal date", i2);
    return E2.readAndFree();
  }
  swe_day_of_week(e3) {
    return this.wasm._swe_day_of_week(e3);
  }
  swe_degnorm(e3) {
    return this.wasm._swe_degnorm(e3);
  }
  swe_deltat_ex(e3, t2) {
    const s2 = l.alloc(this.wasm, this.AS_MAXCH), r2 = this.wasm._swe_deltat_ex(e3, t2, s2.ptr), a2 = s2.readAndFree();
    if (a2.trim().length > 1) throw new _(a2, this.ERR);
    return r2;
  }
  swe_deltat(e3) {
    return this.wasm._swe_deltat(e3);
  }
  swe_difcs2n(e3, t2) {
    return this.wasm._swe_difcs2n(e3, t2);
  }
  swe_difcsn(e3, t2) {
    return this.wasm._swe_difcsn(e3, t2);
  }
  swe_difdeg2n(e3, t2) {
    return this.wasm._swe_difdeg2n(e3, t2);
  }
  swe_difdegn(e3, t2) {
    return this.wasm._swe_difdegn(e3, t2);
  }
  swe_fixstar_mag(e3) {
    const t2 = S.alloc(this.wasm, "double"), s2 = l.alloc(this.wasm, this.AS_MAXCH), r2 = l.from(this.wasm, e3.length, e3), a2 = this.wasm._swe_fixstar_mag(r2.ptr, t2.ptr, s2.ptr);
    if (a2 < this.OK) throw new _(s2.read(), a2);
    return s2.free(), { star_name: r2.readAndFree(), mag: t2.readAndFree() };
  }
  swe_fixstar_ut(e3, t2, s2) {
    const r2 = o.alloc(this.wasm, "double", 6), a2 = l.alloc(this.wasm, this.AS_MAXCH), E2 = l.from(this.wasm, e3.length, e3), i2 = this.wasm._swe_fixstar_ut(E2.ptr, t2, s2, r2.ptr, a2.ptr);
    if (i2 < this.OK) throw new _(a2.read(), i2);
    return a2.free(), { star_name: E2.readAndFree(), data: r2.readAndFree() };
  }
  swe_fixstar(e3, t2, s2) {
    const r2 = o.alloc(this.wasm, "double", 6), a2 = l.alloc(this.wasm, this.AS_MAXCH), E2 = l.from(this.wasm, e3.length, e3), i2 = this.wasm._swe_fixstar(E2.ptr, t2, s2, r2.ptr, a2.ptr);
    if (i2 < this.OK) throw new _(a2.read(), i2);
    return a2.free(), { star_name: E2.readAndFree(), data: r2.readAndFree() };
  }
  swe_fixstar2_mag(e3) {
    const t2 = S.alloc(this.wasm, "double"), s2 = l.alloc(this.wasm, this.AS_MAXCH), r2 = l.from(this.wasm, e3.length, e3), a2 = this.wasm._swe_fixstar2_mag(r2.ptr, t2.ptr, s2.ptr);
    if (a2 < this.OK) throw new _(s2.read(), a2);
    return s2.free(), { star_name: r2.readAndFree(), magnitude: t2.readAndFree() };
  }
  swe_fixstar2_ut(e3, t2, s2) {
    const r2 = o.alloc(this.wasm, "double", 6), a2 = l.alloc(this.wasm, this.AS_MAXCH), E2 = l.from(this.wasm, e3.length, e3), i2 = this.wasm._swe_fixstar2_ut(E2.ptr, t2, s2, r2.ptr, a2.ptr);
    if (i2 < this.OK) throw new _(a2.read(), i2);
    return a2.free(), { star_name: E2.readAndFree(), data: r2.readAndFree() };
  }
  swe_fixstar2(e3, t2, s2) {
    const r2 = o.alloc(this.wasm, "double", 6), a2 = l.alloc(this.wasm, this.AS_MAXCH), E2 = l.from(this.wasm, e3.length, e3), i2 = this.wasm._swe_fixstar2(E2.ptr, t2, s2, r2.ptr, a2.ptr);
    if (i2 < this.OK) throw new _(a2.read(), i2);
    return a2.free(), { star_name: E2.readAndFree(), data: r2.readAndFree() };
  }
  swe_gauquelin_sector(e3, t2, s2, r2, a2, E2, i2, h2) {
    const A2 = o.from(this.wasm, "double", 3, E2), w = l.alloc(this.wasm, this.AS_MAXCH), d = s2 ? l.from(this.wasm, s2.length, s2) : new n(), c = S.alloc(this.wasm, "double"), m = this.wasm._swe_gauquelin_sector(e3, t2, d.ptr, r2, a2, A2.ptr, i2, h2, c.ptr, w.ptr);
    if (d.free(), m < this.OK) throw new _(w.read(), m);
    return w.free(), c.readAndFree();
  }
  swe_get_ayanamsa_ex_ut(e3, t2) {
    const s2 = S.alloc(this.wasm, "double"), r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_get_ayanamsa_ex_ut(e3, t2, s2.ptr, r2.ptr);
    if (a2 < this.OK) throw new _(r2.read(), a2);
    return r2.free(), s2.readAndFree();
  }
  swe_get_ayanamsa_ex(e3, t2) {
    const s2 = S.alloc(this.wasm, "double"), r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_get_ayanamsa_ex_ut(e3, t2, s2.ptr, r2.ptr);
    if (a2 < this.OK) throw new _(r2.read(), a2);
    return r2.free(), s2.readAndFree();
  }
  swe_get_ayanamsa_name(e3) {
    return this.wasm.UTF8ToString(this.wasm._swe_get_ayanamsa_name(e3));
  }
  swe_get_ayanamsa_ut(e3) {
    return this.wasm._swe_get_ayanamsa_ut(e3);
  }
  swe_get_ayanamsa(e3) {
    return this.wasm._swe_get_ayanamsa(e3);
  }
  swe_get_current_file_data(e3) {
    const t2 = S.alloc(this.wasm, "double"), s2 = S.alloc(this.wasm, "double"), _2 = S.alloc(this.wasm, "double");
    return { path: this.wasm.UTF8ToString(this.wasm._swe_get_current_file_data(e3, t2.ptr, s2.ptr, _2.ptr)), start: t2.readAndFree(), end: s2.readAndFree(), denum: _2.readAndFree() };
  }
  swe_get_library_path() {
    const e3 = l.alloc(this.wasm, this.AS_MAXCH);
    return this.wasm._swe_get_library_path(e3.ptr), e3.readAndFree();
  }
  swe_get_orbital_elements(t2, s2, r2) {
    const a2 = o.alloc(this.wasm, "double", 50), E2 = l.alloc(this.wasm, this.AS_MAXCH), i2 = this.wasm._swe_get_orbital_elements(t2, s2, r2, a2.ptr, E2.ptr);
    if (i2 < this.OK) throw new _(E2.read(), i2);
    return E2.free(), e2(a2.readAndFree(), 17);
  }
  swe_get_planet_name(e3) {
    const t2 = l.alloc(this.wasm, this.AS_MAXCH);
    return this.wasm._swe_get_planet_name(e3, t2.ptr), t2.readAndFree();
  }
  swe_get_tid_acc() {
    return this.wasm._swe_get_tid_acc();
  }
  swe_heliacal_pheno_ut(t2, s2, r2, a2, E2, i2, h2) {
    const n2 = o.from(this.wasm, "double", 3, s2), S2 = o.from(this.wasm, "double", 4, r2), A2 = o.from(this.wasm, "double", 6, a2), w = l.from(this.wasm, E2.length, E2), d = o.alloc(this.wasm, "double", 50), c = l.alloc(this.wasm, this.AS_MAXCH), m = this.wasm._swe_heliacal_pheno_ut(t2, n2.ptr, S2.ptr, A2.ptr, w.ptr, i2, h2, d.ptr, c.ptr);
    if (m < this.OK) throw new _(c.read(), m);
    return c.free(), n2.free(), S2.free(), A2.free(), w.free(), e2(d.readAndFree(), 30);
  }
  swe_heliacal_ut(t2, s2, r2, a2, E2, i2, h2) {
    const n2 = o.from(this.wasm, "double", 3, s2), S2 = o.from(this.wasm, "double", 4, r2), A2 = o.from(this.wasm, "double", 6, a2), w = l.from(this.wasm, E2.length, E2), d = o.alloc(this.wasm, "double", 50), c = l.alloc(this.wasm, this.AS_MAXCH), m = this.wasm._swe_heliacal_ut(t2, n2.ptr, S2.ptr, A2.ptr, w.ptr, i2, h2, d.ptr, c.ptr);
    if (m < this.OK) throw new _(c.read(), m);
    return c.free(), n2.free(), S2.free(), A2.free(), w.free(), e2(d.readAndFree(), 3);
  }
  swe_helio_cross_ut(e3, t2, s2, r2, a2) {
    const E2 = S.alloc(this.wasm, "double"), i2 = l.alloc(this.wasm, this.AS_MAXCH), o2 = this.wasm._swe_helio_cross_ut(e3, t2, s2, r2, a2, E2.ptr, i2.ptr);
    if (o2 < this.OK) throw new _(i2.readAndFree(), o2);
    return i2.free(), E2.readAndFree();
  }
  swe_helio_cross(e3, t2, s2, r2, a2) {
    const E2 = S.alloc(this.wasm, "double"), i2 = l.alloc(this.wasm, this.AS_MAXCH), o2 = this.wasm._swe_helio_cross(e3, t2, s2, r2, a2, E2.ptr, i2.ptr);
    if (o2 < this.OK) throw new _(i2.read(), o2);
    return i2.free(), E2.readAndFree();
  }
  swe_house_name(e3) {
    return this.wasm.UTF8ToString(this.wasm._swe_house_name(h.charToC(e3)));
  }
  swe_house_pos(e3, t2, s2, r2, a2) {
    const E2 = o.from(this.wasm, "double", 2, a2), i2 = l.alloc(this.wasm, this.AS_MAXCH), n2 = this.wasm._swe_house_pos(e3, t2, s2, h.charToC(r2), E2.ptr, i2.ptr), S2 = i2.readAndFree();
    if (S2.trim().length > 1) throw new _(S2, this.ERR);
    return n2;
  }
  swe_houses_armc_ex2(t2, s2, r2, a2, E2) {
    const i2 = "G" === a2 ? 37 : 13, n2 = o.alloc(this.wasm, "double", 37), S2 = o.alloc(this.wasm, "double", 37), A2 = o.alloc(this.wasm, "double", 10), w = o.alloc(this.wasm, "double", 10), d = l.alloc(this.wasm, this.AS_MAXCH);
    void 0 === E2 || isNaN(E2) || A2.add(9, E2);
    const c = this.wasm._swe_houses_armc_ex2(t2, s2, r2, h.charToC(a2), n2.ptr, A2.ptr, S2.ptr, w.ptr, d.ptr);
    if (c < this.OK) throw new _(d.readAndFree(), c);
    d.free();
    const m = {};
    return m.cusps = e2(n2.readAndFree(), i2, 0), m.ascmc = e2(A2.readAndFree(), 8), m.cusp_speed = e2(S2.readAndFree(), i2, 0), m.ascmc_speed = e2(w.readAndFree(), 8), m;
  }
  swe_houses_armc(t2, s2, r2, a2, E2) {
    const i2 = "G" === a2 ? 37 : 13, n2 = o.alloc(this.wasm, "double", 37), S2 = o.alloc(this.wasm, "double", 10);
    void 0 === E2 || isNaN(E2) || S2.add(9, E2);
    const l2 = this.wasm._swe_houses_armc(t2, s2, r2, h.charToC(a2), n2.ptr, S2.ptr);
    if (l2 < this.OK) throw new _("swe_houses_armc", l2);
    const A2 = {};
    return A2.cusps = e2(n2.readAndFree(), i2, 0), A2.ascmc = e2(S2.readAndFree(), 8), A2;
  }
  swe_houses_ex(t2, s2, r2, a2, E2) {
    const i2 = "G" === E2 ? 37 : 13, n2 = o.alloc(this.wasm, "double", 37), S2 = o.alloc(this.wasm, "double", 10), l2 = this.wasm._swe_houses_ex(t2, s2, r2, a2, h.charToC(E2), n2.ptr, S2.ptr);
    if (l2 < this.OK) throw new _("swe_houses_ex", l2);
    const A2 = {};
    return A2.cusps = e2(n2.readAndFree(), i2, 0), A2.ascmc = e2(S2.readAndFree(), 8), A2;
  }
  swe_houses_ex2(t2, s2, r2, a2, E2) {
    const i2 = "G" === E2 ? 37 : 13, n2 = o.alloc(this.wasm, "double", 37), S2 = o.alloc(this.wasm, "double", 10), A2 = o.alloc(this.wasm, "double", 37), w = o.alloc(this.wasm, "double", 10), d = l.alloc(this.wasm, this.AS_MAXCH), c = this.wasm._swe_houses_ex2(t2, s2, r2, a2, h.charToC(E2), n2.ptr, S2.ptr, A2.ptr, w.ptr, d.ptr);
    if (c < this.OK) throw new _(d.readAndFree(), c);
    d.free();
    const m = {};
    return m.cusps = e2(n2.readAndFree(), i2, 0), m.ascmc = e2(S2.readAndFree(), 8), m.cusp_speed = e2(A2.readAndFree(), i2, 0), m.ascmc_speed = e2(w.readAndFree(), 8), m;
  }
  swe_houses(t2, s2, r2, a2) {
    const E2 = "G" === a2 ? 37 : 13, i2 = o.alloc(this.wasm, "double", 37), n2 = o.alloc(this.wasm, "double", 10), S2 = this.wasm._swe_houses(t2, s2, r2, h.charToC(a2), i2.ptr, n2.ptr);
    if (S2 < this.OK) throw new _("swe_houses", S2);
    const l2 = {};
    return l2.cusps = e2(i2.readAndFree(), E2, 0), l2.ascmc = e2(n2.readAndFree(), 8), l2;
  }
  swe_jdet_to_utc(e3, t2) {
    const s2 = S.alloc(this.wasm, "i32"), _2 = S.alloc(this.wasm, "i32"), r2 = S.alloc(this.wasm, "i32"), a2 = S.alloc(this.wasm, "i32"), E2 = S.alloc(this.wasm, "i32"), i2 = S.alloc(this.wasm, "double");
    return this.wasm._swe_jdet_to_utc(e3, t2, s2.ptr, _2.ptr, r2.ptr, a2.ptr, E2.ptr, i2.ptr), { year: s2.readAndFree(), month: _2.readAndFree(), day: r2.readAndFree(), hour: a2.readAndFree(), minute: E2.readAndFree(), second: i2.readAndFree() };
  }
  swe_jdut1_to_utc(e3, t2) {
    const s2 = S.alloc(this.wasm, "i32"), _2 = S.alloc(this.wasm, "i32"), r2 = S.alloc(this.wasm, "i32"), a2 = S.alloc(this.wasm, "i32"), E2 = S.alloc(this.wasm, "i32"), i2 = S.alloc(this.wasm, "double");
    return this.wasm._swe_jdut1_to_utc(e3, t2, s2.ptr, _2.ptr, r2.ptr, a2.ptr, E2.ptr, i2.ptr), { year: s2.readAndFree(), month: _2.readAndFree(), day: r2.readAndFree(), hour: a2.readAndFree(), minute: E2.readAndFree(), second: i2.readAndFree() };
  }
  swe_julday(e3, t2, s2, _2, r2) {
    return this.wasm._swe_julday(e3, t2, s2, _2, r2);
  }
  swe_lat_to_lmt(e3, t2) {
    const s2 = S.alloc(this.wasm, "double"), r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_lat_to_lmt(e3, t2, s2.ptr, r2.ptr);
    if (a2 < this.OK) throw new _(r2.readAndFree(), a2);
    return r2.free(), s2.readAndFree();
  }
  swe_lmt_to_lat(e3, t2) {
    const s2 = S.alloc(this.wasm, "double"), r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_lmt_to_lat(e3, t2, s2.ptr, r2.ptr);
    if (a2 < this.OK) throw new _(r2.readAndFree(), a2);
    return r2.free(), s2.readAndFree();
  }
  swe_lun_eclipse_how(t2, s2, r2) {
    const a2 = o.from(this.wasm, "double", 3, r2), E2 = o.alloc(this.wasm, "double", 20), i2 = l.alloc(this.wasm, this.AS_MAXCH), h2 = this.wasm._swe_lun_eclipse_how(t2, s2, a2.ptr, E2.ptr, i2.ptr);
    if (h2 < this.OK) throw new _(i2.readAndFree(), h2);
    return i2.free(), e2(E2.readAndFree(), 11);
  }
  swe_lun_eclipse_when_loc(t2, s2, r2, a2) {
    const E2 = o.from(this.wasm, "double", 3, r2), i2 = o.alloc(this.wasm, "double", 10), n2 = o.alloc(this.wasm, "double", 20), S2 = l.alloc(this.wasm, this.AS_MAXCH), A2 = this.wasm._swe_lun_eclipse_when_loc(t2, s2, E2.ptr, i2.ptr, n2.ptr, h.boolToC(a2), S2.ptr);
    if (E2.free(), A2 < this.OK) throw new _(S2.readAndFree(), A2);
    return S2.free(), { data: i2.readAndFree(), Array: e2(n2.readAndFree(), 11) };
  }
  swe_lun_eclipse_when(t2, s2, r2, a2) {
    const E2 = o.alloc(this.wasm, "double", 10), i2 = l.alloc(this.wasm, this.AS_MAXCH), n2 = this.wasm._swe_lun_eclipse_when(t2, s2, r2, E2.ptr, h.boolToC(a2), i2.ptr);
    if (n2 < this.OK) throw new _(i2.read(), n2);
    return i2.free(), e2(E2.readAndFree(), 8);
  }
  swe_lun_occult_when_glob(e3, t2, s2, r2, a2, E2) {
    const i2 = s2 ? l.from(this.wasm, s2.length, s2) : new n(), S2 = o.alloc(this.wasm, "double", 10), A2 = l.alloc(this.wasm, this.AS_MAXCH), w = this.wasm._swe_lun_occult_when_glob(e3, t2, i2.ptr, r2, a2, S2.ptr, h.boolToC(E2), A2.ptr);
    if (i2.free(), w < this.OK) throw new _(A2.read(), w);
    return A2.free(), S2.readAndFree();
  }
  swe_lun_occult_when_loc(t2, s2, r2, a2, E2, i2) {
    const S2 = o.from(this.wasm, "double", 3, E2), A2 = o.alloc(this.wasm, "double", 10), w = o.alloc(this.wasm, "double", 20), d = l.alloc(this.wasm, this.AS_MAXCH), c = r2 ? l.from(this.wasm, r2.length, r2) : new n(), m = this.wasm._swe_lun_occult_when_loc(t2, s2, c.ptr, a2, S2.ptr, A2.ptr, w.ptr, h.boolToC(i2), d.ptr);
    if (S2.free(), c.free(), m < this.OK) throw new _(d.read(), m);
    return d.free(), { data: e2(A2.readAndFree(), 7), Array: e2(w.readAndFree(), 8) };
  }
  swe_lun_occult_where(t2, s2, r2, a2) {
    const E2 = o.alloc(this.wasm, "double", 10), i2 = o.alloc(this.wasm, "double", 20), h2 = l.alloc(this.wasm, this.AS_MAXCH), S2 = r2 ? l.from(this.wasm, r2.length, r2) : new n(), A2 = this.wasm._swe_lun_occult_where(t2, s2, S2.ptr, a2, E2.ptr, i2.ptr, h2.ptr);
    if (S2.free(), A2 < this.OK) throw new _(h2.read(), A2);
    return h2.free(), { data: E2.readAndFree(), Array: e2(i2.readAndFree(), 8) };
  }
  swe_mooncross_node_ut(e3, t2) {
    const s2 = l.alloc(this.wasm, this.AS_MAXCH), r2 = S.alloc(this.wasm, "double"), a2 = S.alloc(this.wasm, "double"), E2 = this.wasm._swe_mooncross_node_ut(e3, t2, r2.ptr, a2.ptr, s2.ptr);
    if (t2 < this.OK) throw new _(s2.readAndFree(), t2);
    return s2.free(), { jd: E2, longitude: r2.readAndFree(), latitude: a2.readAndFree() };
  }
  swe_mooncross_node(e3, t2) {
    const s2 = l.alloc(this.wasm, this.AS_MAXCH), r2 = S.alloc(this.wasm, "double"), a2 = S.alloc(this.wasm, "double"), E2 = this.wasm._swe_mooncross_node(e3, t2, r2.ptr, a2.ptr, s2.ptr);
    if (t2 < this.OK) throw new _(s2.readAndFree(), t2);
    return s2.free(), { jd: E2, longitude: r2.readAndFree(), latitude: a2.readAndFree() };
  }
  swe_mooncross_ut(e3, t2, s2) {
    const r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_mooncross_ut(e3, t2, s2, r2.ptr);
    if (s2 < this.OK) throw new _(r2.readAndFree(), s2);
    return r2.free(), a2;
  }
  swe_mooncross(e3, t2, s2) {
    const r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_mooncross(e3, t2, s2, r2.ptr);
    if (s2 < this.OK) throw new _(r2.readAndFree(), s2);
    return r2.free(), a2;
  }
  swe_nod_aps_ut(e3, t2, s2, r2) {
    const a2 = o.alloc(this.wasm, "double", 6), E2 = o.alloc(this.wasm, "double", 6), i2 = o.alloc(this.wasm, "double", 6), h2 = o.alloc(this.wasm, "double", 6), n2 = l.alloc(this.wasm, this.AS_MAXCH), S2 = this.wasm._swe_nod_aps_ut(e3, t2, s2, r2, a2.ptr, E2.ptr, i2.ptr, h2.ptr, n2.ptr);
    if (S2 < this.OK) throw new _(n2.readAndFree(), S2);
    return n2.free(), { ascending: a2.readAndFree(), descending: E2.readAndFree(), perihelion: i2.readAndFree(), aphelion: h2.readAndFree() };
  }
  swe_nod_aps(e3, t2, s2, r2) {
    const a2 = o.alloc(this.wasm, "double", 6), E2 = o.alloc(this.wasm, "double", 6), i2 = o.alloc(this.wasm, "double", 6), h2 = o.alloc(this.wasm, "double", 6), n2 = l.alloc(this.wasm, this.AS_MAXCH), S2 = this.wasm._swe_nod_aps(e3, t2, s2, r2, a2.ptr, E2.ptr, i2.ptr, h2.ptr, n2.ptr);
    if (S2 < this.OK) throw new _(n2.readAndFree(), S2);
    return n2.free(), { ascending: a2.readAndFree(), descending: E2.readAndFree(), perihelion: i2.readAndFree(), aphelion: h2.readAndFree() };
  }
  swe_orbit_max_min_true_distance(e3, t2, s2) {
    const r2 = S.alloc(this.wasm, "double"), a2 = S.alloc(this.wasm, "double"), E2 = S.alloc(this.wasm, "double"), i2 = l.alloc(this.wasm, this.AS_MAXCH), o2 = this.wasm._swe_orbit_max_min_true_distance(e3, t2, s2, r2.ptr, a2.ptr, E2.ptr, i2.ptr);
    if (o2 < this.OK) throw new _(i2.readAndFree(), o2);
    return i2.free(), { max: r2.readAndFree(), min: a2.readAndFree(), true: E2.readAndFree() };
  }
  swe_pheno_ut(t2, s2, r2) {
    const a2 = o.alloc(this.wasm, "double", 20), E2 = l.alloc(this.wasm, this.AS_MAXCH), i2 = this.wasm._swe_pheno_ut(t2, s2, r2, a2.ptr, E2.ptr);
    if (i2 < this.OK) throw new _(E2.readAndFree(), i2);
    return E2.free(), e2(a2.readAndFree(), 5);
  }
  swe_pheno(t2, s2, r2) {
    const a2 = o.alloc(this.wasm, "double", 20), E2 = l.alloc(this.wasm, this.AS_MAXCH), i2 = this.wasm._swe_pheno(t2, s2, r2, a2.ptr, E2.ptr);
    if (i2 < this.OK) throw new _(E2.readAndFree(), i2);
    return E2.free(), e2(a2.readAndFree(), 5);
  }
  swe_radnorm(e3) {
    return this.wasm._swe_radnorm(e3);
  }
  swe_refrac_extended(t2, s2, _2, r2, a2, E2) {
    const i2 = o.alloc(this.wasm, "double", 20);
    return { altitude: this.wasm._swe_refrac_extended(t2, s2, _2, r2, a2, E2, i2.ptr), extended: e2(i2.readAndFree(), 4) };
  }
  swe_refrac(e3, t2, s2, _2) {
    return this.wasm._swe_refrac(e3, t2, s2, _2);
  }
  swe_revjul(e3, t2) {
    const s2 = S.alloc(this.wasm, "i32"), _2 = S.alloc(this.wasm, "i32"), r2 = S.alloc(this.wasm, "i32"), a2 = S.alloc(this.wasm, "double");
    return this.wasm._swe_revjul(e3, t2, s2.ptr, _2.ptr, r2.ptr, a2.ptr), { year: s2.readAndFree(), month: _2.readAndFree(), day: r2.readAndFree(), hour: a2.readAndFree() };
  }
  swe_rise_trans_true_hor(e3, t2, s2, r2, a2, E2, i2, h2, A2) {
    const w = o.from(this.wasm, "double", 3, E2), d = S.alloc(this.wasm, "double"), c = l.alloc(this.wasm, this.AS_MAXCH), m = s2 ? l.from(this.wasm, s2.length, s2) : new n(), L = this.wasm._swe_rise_trans_true_hor(e3, t2, m.ptr, r2, a2, w.ptr, i2, h2, A2, d.ptr, c.ptr);
    if (w.free(), m.free(), L < this.OK) throw new _(c.readAndFree(), L);
    return c.free(), d.readAndFree();
  }
  swe_rise_trans(e3, t2, s2, r2, a2, E2, i2, h2) {
    const A2 = o.from(this.wasm, "double", 3, E2), w = S.alloc(this.wasm, "double"), d = l.alloc(this.wasm, this.AS_MAXCH), c = s2 ? l.from(this.wasm, s2.length, s2) : new n(), m = this.wasm._swe_rise_trans(e3, t2, c.ptr, r2, a2, A2.ptr, i2, h2, w.ptr, d.ptr);
    if (m < this.OK) throw new _(d.readAndFree(), m);
    return d.free(), w.readAndFree();
  }
  swe_set_delta_t_userdef(e3) {
    return this.wasm._swe_set_delta_t_userdef(e3);
  }
  async swe_set_ephe_path(e3 = "https://ptprashanttripathi.github.io/sweph-wasm/ephe/", t2 = ["seas_18.se1", "sepl_18.se1", "semo_18.se1"]) {
    const r2 = "/ephe";
    this.wasm.FS.analyzePath(r2, true).exists || this.wasm.FS.mkdir(r2);
    const a2 = (function(e4) {
      let t3 = e4.replace(/\/+$/, "");
      const s2 = t3.split("/").pop();
      return s2 && /\.[a-z0-9]+$/i.test(s2) && (t3 = t3.substring(0, t3.lastIndexOf("/"))), t3;
    })(e3), E2 = s.filter(({ name: e4 }) => !t2 || t2.includes(e4)), i2 = (await Promise.all(E2.map(async ({ name: e4, desc: t3, category: s2 }) => {
      try {
        const _2 = await fetch(`${a2}/${e4}`);
        if (_2.ok && 200 === _2.status) {
          const a3 = await _2.arrayBuffer(), E3 = new Uint8Array(a3), i3 = `${r2}/${e4}`;
          return this.wasm.FS.analyzePath(i3).exists && this.wasm.FS.unlink(i3), this.wasm.FS.createDataFile(r2, e4, E3, true, true, true), `${e4.padEnd(14)}: ${s2.padEnd(28)} [${t3}]`;
        }
      } catch (t4) {
        console.error(`Skipped ${e4} due to error:`, t4);
      }
      return null;
    }))).filter(Boolean);
    if (0 === i2.length) throw new _(`No ephemeris files loaded from "${e3}"`, this.ERR);
    console.log(i2.join("\n")), console.log(`Total ephemeris files loaded: ${i2.length}`);
    const o2 = l.from(this.wasm, 5, r2);
    this.wasm._swe_set_ephe_path(o2.ptr), o2.free();
  }
  swe_set_jpl_file(e3) {
    const t2 = l.from(this.wasm, e3.length, e3);
    this.wasm._swe_set_jpl_file(t2.ptr), t2.free();
  }
  swe_set_sid_mode(e3, t2, s2) {
    this.wasm._swe_set_sid_mode(e3, t2, s2);
  }
  swe_set_tid_acc(e3) {
    this.wasm._swe_set_tid_acc(e3);
  }
  swe_set_topo(e3, t2, s2) {
    this.wasm._swe_set_topo(e3, t2, s2);
  }
  swe_sidtime(e3) {
    return this.wasm._swe_sidtime(e3);
  }
  swe_sidtime0(e3, t2, s2) {
    return this.wasm._swe_sidtime0(e3, t2, s2);
  }
  swe_sol_eclipse_how(t2, s2, r2) {
    const a2 = o.from(this.wasm, "double", 3, r2), E2 = o.alloc(this.wasm, "double", 20), i2 = l.alloc(this.wasm, this.AS_MAXCH), h2 = this.wasm._swe_sol_eclipse_how(t2, s2, a2.ptr, E2.ptr, i2.ptr);
    if (a2.free(), h2 < this.OK) throw new _(i2.readAndFree(), h2);
    return i2.free(), e2(E2.readAndFree(), 11);
  }
  swe_sol_eclipse_when_glob(e3, t2, s2, r2) {
    const a2 = o.alloc(this.wasm, "double", 10), E2 = l.alloc(this.wasm, this.AS_MAXCH), i2 = this.wasm._swe_sol_eclipse_when_glob(e3, t2, s2, a2.ptr, h.boolToC(r2), E2.ptr);
    if (i2 < this.OK) throw new _(E2.readAndFree(), i2);
    return E2.free(), a2.readAndFree();
  }
  swe_sol_eclipse_when_loc(t2, s2, r2, a2) {
    const E2 = o.from(this.wasm, "double", 3, r2), i2 = o.alloc(this.wasm, "double", 10), n2 = o.alloc(this.wasm, "double", 20), S2 = l.alloc(this.wasm, this.AS_MAXCH), A2 = this.wasm._swe_sol_eclipse_when_loc(t2, s2, E2.ptr, i2.ptr, n2.ptr, h.boolToC(a2), S2.ptr);
    E2.free();
    const w = S2.readAndFree();
    if (A2 < this.OK) throw new _(w, A2);
    return { eclipseContactTimes: e2(i2.readAndFree(), 7), eclipseAttributes: e2(n2.readAndFree(), 11) };
  }
  swe_sol_eclipse_where(t2, s2) {
    const r2 = o.alloc(this.wasm, "double", 10), a2 = o.alloc(this.wasm, "double", 20), E2 = l.alloc(this.wasm, this.AS_MAXCH), i2 = this.wasm._swe_sol_eclipse_where(t2, s2, r2.ptr, a2.ptr, E2.ptr);
    if (i2 < this.OK) throw new _(E2.readAndFree(), i2);
    return E2.free(), { data: r2.readAndFree(), Array: e2(a2.readAndFree(), 11) };
  }
  swe_solcross_ut(e3, t2, s2) {
    const r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_solcross_ut(e3, t2, s2, r2.ptr);
    if (s2 < this.OK) throw new _(r2.readAndFree(), s2);
    return r2.free(), a2;
  }
  swe_solcross(e3, t2, s2) {
    const r2 = l.alloc(this.wasm, this.AS_MAXCH), a2 = this.wasm._swe_solcross(e3, t2, s2, r2.ptr);
    if (s2 < this.OK) throw new _(r2.readAndFree(), s2);
    return r2.free(), a2;
  }
  swe_split_deg(e3, t2) {
    const s2 = S.alloc(this.wasm, "i32"), _2 = S.alloc(this.wasm, "i32"), r2 = S.alloc(this.wasm, "i32"), a2 = S.alloc(this.wasm, "double"), E2 = S.alloc(this.wasm, "i32");
    return this.wasm._swe_split_deg(e3, t2, s2.ptr, _2.ptr, r2.ptr, a2.ptr, E2.ptr), { degree: s2.readAndFree(), minute: _2.readAndFree(), second: r2.readAndFree(), fraction: a2.readAndFree(), sign: E2.readAndFree() };
  }
  swe_time_equ(e3) {
    const t2 = S.alloc(this.wasm, "double"), s2 = l.alloc(this.wasm, this.AS_MAXCH), r2 = this.wasm._swe_time_equ(e3, t2.ptr, s2.ptr);
    if (r2 < this.OK) throw new _(s2.readAndFree(), r2);
    return s2.free(), t2.readAndFree();
  }
  swe_utc_time_zone(e3, t2, s2, _2, r2, a2, E2) {
    const i2 = S.alloc(this.wasm, "i32"), o2 = S.alloc(this.wasm, "i32"), h2 = S.alloc(this.wasm, "i32"), n2 = S.alloc(this.wasm, "i32"), l2 = S.alloc(this.wasm, "i32"), A2 = S.alloc(this.wasm, "double");
    return this.wasm._swe_utc_time_zone(e3, t2, s2, _2, r2, a2, E2, i2.ptr, o2.ptr, h2.ptr, n2.ptr, l2.ptr, A2.ptr), { year: i2.readAndFree(), month: o2.readAndFree(), day: h2.readAndFree(), hour: n2.readAndFree(), minute: l2.readAndFree(), second: A2.readAndFree() };
  }
  swe_utc_to_jd(e3, t2, s2, r2, a2, E2, i2) {
    const h2 = o.alloc(this.wasm, "double", 2), n2 = l.alloc(this.wasm, this.AS_MAXCH), S2 = this.wasm._swe_utc_to_jd(e3, t2, s2, r2, a2, E2, i2, h2.ptr, n2.ptr);
    if (S2 < this.OK) throw new _(n2.readAndFree(), S2);
    return n2.free(), h2.readAndFree();
  }
  swe_version() {
    const e3 = l.alloc(this.wasm, this.AS_MAXCH);
    return this.wasm._swe_version(e3.ptr), e3.readAndFree();
  }
  swe_vis_limit_mag(e3, t2, s2, r2, a2, E2) {
    const i2 = o.from(this.wasm, "double", 3, t2), h2 = o.from(this.wasm, "double", 4, s2), n2 = o.from(this.wasm, "double", 6, r2), S2 = o.alloc(this.wasm, "double", 8), A2 = l.from(this.wasm, a2.length, a2), w = l.alloc(this.wasm, this.AS_MAXCH), d = this.wasm._swe_vis_limit_mag(e3, i2.ptr, h2.ptr, n2.ptr, A2.ptr, E2, S2.ptr, w.ptr);
    if (i2.free(), h2.free(), n2.free(), A2.free(), d < this.OK) throw new _(w.readAndFree(), d);
    return w.free(), S2.readAndFree();
  }
};

// www/places.mjs
var DATA = null;
var LOADING = null;
function load(url) {
  if (DATA) return Promise.resolve(DATA);
  if (!LOADING) LOADING = fetch(url).then((r2) => r2.json()).then((d) => {
    DATA = d;
    return d;
  });
  return LOADING;
}
function tzFor(lat, lon) {
  if (!DATA) return null;
  let best = null, bd = 1e18;
  const cl = Math.cos(lat * Math.PI / 180);
  for (const r2 of DATA.rows) {
    let dx = r2[3] - lon;
    if (dx > 180) dx -= 360;
    if (dx < -180) dx += 360;
    const d = (r2[2] - lat) ** 2 + (dx * cl) ** 2;
    if (d < bd) {
      bd = d;
      best = r2;
    }
  }
  return best ? DATA.tz[best[5]] : null;
}

// engine-src.mjs
var ROOT = new URL("../", import.meta.url).href;
var IN_WORKER = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
var api = null;
function post(m) {
  if (IN_WORKER) self.postMessage(m);
  else window.dispatchEvent(new CustomEvent("engine-msg", { detail: m }));
}
async function init() {
  post({ type: "status", msg: "Loading ephemeris..." });
  const swe = await A.init(ROOT + "vendor/sweph/swisseph.wasm");
  await load(ROOT + "data/places.json");
  post({ type: "status", msg: "Starting Python engine..." });
  const { loadPyodide } = await import(
    /* @vite-ignore */
    ROOT + "vendor/pyodide/pyodide.mjs"
  );
  const py = await loadPyodide({ indexURL: ROOT + "vendor/pyodide/" });
  py.registerJsModule("_swe_js", {
    julday: (y, m, d, h2, g) => swe.swe_julday(y, m, d, h2, g),
    revjul: (jd, g) => swe.swe_revjul(jd, g),
    set_sid_mode: (m, a2, b) => swe.swe_set_sid_mode(m, a2, b),
    get_ayanamsa_ut: (jd) => swe.swe_get_ayanamsa_ut(jd),
    calc_ut: (jd, ipl, f) => swe.swe_calc_ut(jd, ipl, f),
    houses_ex: (jd, f, lat, lon, h2) => swe.swe_houses_ex(jd, f, lat, lon, h2),
    rise_trans: (jd, ipl, ef, rsmi, lon, lat, alt, p, t2) => swe.swe_rise_trans(jd, ipl, null, ef, rsmi, [lon, lat, alt], p, t2),
    tz_for: (lat, lon) => tzFor(lat, lon)
  });
  const wheel = await (await fetch(ROOT + "vendor/tzdata.whl")).arrayBuffer();
  await py.unpackArchive(wheel, "wheel");
  const files = await (await fetch(ROOT + "py/manifest.json")).json();
  for (const f of files) {
    const dir = f.includes("/") ? "/home/pyodide/py/" + f.slice(0, f.lastIndexOf("/")) : "/home/pyodide/py";
    py.FS.mkdirTree(dir);
    py.FS.writeFile("/home/pyodide/py/" + f, new Uint8Array(await (await fetch(ROOT + "py/" + f)).arrayBuffer()));
  }
  py.runPython("import sys; sys.path.insert(0, '/home/pyodide/py')");
  api = py.pyimport("api");
  post({ type: "ready" });
}
var ready = init().catch((e3) => {
  post({ type: "fatal", error: String(e3 && e3.stack || e3) });
  throw e3;
});
async function handle({ id, path, body }) {
  try {
    await ready;
    const res = api.dispatch(path, body);
    post({ type: "result", id, result: res });
  } catch (e3) {
    post({ type: "result", id, result: JSON.stringify({ error: String(e3 && e3.message || e3) }) });
  }
}
if (IN_WORKER) self.onmessage = (ev) => handle(ev.data);
else window.__engineCall = handle;
