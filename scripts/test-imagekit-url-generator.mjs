import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

const server = fs.readFileSync("supabase/functions/imagekit-url-generator/index.ts", "utf8");
const ui = fs.readFileSync("imagekit-url-generator.html", "utf8");
const home = fs.readFileSync("index.html", "utf8");
const coreScript = fs.readFileSync("imagekit-url-core.js", "utf8");

let handler;
let upstreamCalls = [];
let mockUpstream = async () => Response.json([]);
const token = "test-access-token-abcdefghijklmnopqrstuvwxyz-1234";
const env = new Map([
  ["IMAGEKIT_URL_TOOL_TOKEN", token],
  ["IMAGEKIT_ACCOUNTS", JSON.stringify([
    {id:"tgm",label:"Trigamma Metri",secretName:"IMAGEKIT_PRIVATE_KEY_TGM"},
    {id:"tnl",label:"TNL",secretName:"IMAGEKIT_PRIVATE_KEY_TNL"},
  ])],
  ["IMAGEKIT_PRIVATE_KEY_TGM", "private_test_tgm"],
  ["IMAGEKIT_PRIVATE_KEY_TNL", "private_test_tnl"],
]);

const context = {
  Deno: { env: {get:(key) => env.get(key)}, serve:(fn) => { handler = fn; } },
  Response, URL, URLSearchParams, TextEncoder, Uint8Array, AbortSignal, crypto:webcrypto,
  btoa:(value) => Buffer.from(value).toString("base64"),
  fetch:async (url,init) => { upstreamCalls.push({url,init}); return mockUpstream(url,init); },
  console: {error:()=>{}},
};
vm.runInNewContext(server, context, {filename:"imagekit-url-generator/index.ts"});
assert.equal(typeof handler, "function");

function request({
  method="POST", origin="https://yedisupriadi.github.io", auth=token,
  body={action:"files",accountId:"tgm",skip:0},
}={}) {
  const headers = {origin};
  if (auth !== null) headers["x-tool-token"] = auth;
  if (method === "POST") headers["content-type"] = "application/json";
  return handler(new Request("https://test.supabase.co/functions/v1/imagekit-url-generator", {
    method,headers,...(method==="POST" ? {body:JSON.stringify(body)} : {}),
  }));
}
function imageItem(index, folder="/261002/") {
  return {
    type:"file",fileId:"id-"+index,name:"Image_"+index+".jpg",
    url:"https://ik.imagekit.io/account"+folder+"Image_"+index+".jpg",
    filePath:folder+"Image_"+index+".jpg",width:800,height:600,size:1024,
    isPrivateFile:false,createdAt:"2026-11-14T12:00:00Z",
    thumbnail:"https://ik.imagekit.io/account/tr:w-100/Image_"+index+".jpg",
  };
}

// Deny unauthorized, wrong method, and untrusted origin BEFORE reading any image data.
upstreamCalls=[];
let response=await request({auth:"incorrect-token"});
assert.equal(response.status,401);
response=await request({origin:"https://attacker.invalid"});
assert.equal(response.status,403);
response=await request({method:"DELETE"});
assert.equal(response.status,405);
response=await request({body:{action:"delete"}});
assert.equal(response.status,400);
assert.equal(upstreamCalls.length,0);

response=await request({method:"OPTIONS"});
assert.equal(response.status,204);
assert.equal(response.headers.get("access-control-allow-origin"),"https://yedisupriadi.github.io");

// The account listing is authenticated but never reveals secret names / credentials.
response=await request({body:{action:"accounts"}});
let data=await response.json();
assert.equal(response.status,200);
assert.deepEqual(JSON.parse(JSON.stringify(data.accounts)),[
  {id:"tgm",label:"Trigamma Metri"},
  {id:"tnl",label:"TNL"},
]);
assert.ok(!JSON.stringify(data).includes("private_test"));
assert.ok(!JSON.stringify(data).includes("secretName"));
assert.equal(upstreamCalls.length,0);

// Per-account credential isolation and whole-library retrieval: no path restriction.
mockUpstream=async () => Response.json(Array.from({length:250},(_,i)=>imageItem(i, i%2 ? "/261005/sub/" : "/261002/")));
response=await request({body:{action:"files",accountId:"tgm",skip:0}});
assert.equal(response.status,200);
data=await response.json();
assert.equal(data.items.length,250);
assert.equal(data.items[0].accountId,"tgm");
assert.equal(data.items[0].accountName,"Trigamma Metri");
assert.equal(data.items[0].folderPath,"/261002/");
assert.equal(data.items[1].folderPath,"/261005/sub/");
assert.equal(data.items[0].thumbnailUrl,"https://ik.imagekit.io/account/tr:w-100/Image_0.jpg");
assert.equal(data.nextSkip,250);
assert.equal(data.hasMore,true);
assert.ok(upstreamCalls[0].url.includes("fileType=image"));
assert.ok(upstreamCalls[0].url.includes("type=file"));
assert.ok(upstreamCalls[0].url.includes("limit=250"));
assert.ok(!upstreamCalls[0].url.includes("path="),"all-library request must omit path");
assert.equal(upstreamCalls[0].init.method,"GET");
assert.equal(upstreamCalls[0].init.headers.Authorization,"Basic "+Buffer.from("private_test_tgm:").toString("base64"));

mockUpstream=async () => Response.json([imageItem(250)]);
response=await request({body:{action:"files",accountId:"tnl",skip:250}});
data=await response.json();
assert.equal(data.items.length,1);
assert.equal(data.hasMore,false);
assert.equal(data.nextSkip,251);
assert.equal(data.accountId,"tnl");
assert.equal(upstreamCalls.at(-1).init.headers.Authorization,"Basic "+Buffer.from("private_test_tnl:").toString("base64"));

response=await request({body:{action:"files",accountId:"unknown",skip:0}});
assert.equal(response.status,404);
response=await request({body:{action:"files",accountId:"tgm",skip:-1}});
assert.equal(response.status,400);
response=await request({body:{action:"files",accountId:"tgm",skip:10000001}});
assert.equal(response.status,400);

// API failures are scoped to the selected account; the other account stays available.
mockUpstream=async (url,init) => {
  if (init.headers.Authorization.includes(Buffer.from("private_test_tgm:").toString("base64"))) {
    return new Response("Unauthorized",{status:401});
  }
  return Response.json([imageItem(2)]);
};
response=await request({body:{action:"files",accountId:"tgm"}});
assert.equal(response.status,502);
response=await request({body:{action:"files",accountId:"tnl"}});
assert.equal(response.status,200);

mockUpstream=async () => new Response("Rate limit",{status:429,headers:{"retry-after":"2"}});
response=await request({body:{action:"files",accountId:"tnl"}});
data=await response.json();
assert.equal(response.status,429);
assert.equal(data.retryAfterMs,2000);

mockUpstream=async () => Response.json([{...imageItem(9),url:"http://bad.example/path",isPrivateFile:true}]);
response=await request({body:{action:"files",accountId:"tnl"}});
data=await response.json();
assert.equal(data.items[0].url,"");
assert.equal(data.items[0].isPrivateFile,true);

// Broken registry fails closed; legacy one-account secret remains supported.
env.set("IMAGEKIT_ACCOUNTS",'[{"id":"tgm","label":"TGM","secretName":"IMAGEKIT_PRIVATE_KEY_MISSING"}]');
response=await request({body:{action:"accounts"}});
assert.equal(response.status,503);
env.set("IMAGEKIT_ACCOUNTS",'[{"id":"tgm","label":"TGM","secretName":"IMAGEKIT_PRIVATE_KEY_TGM"},{"id":"tgm","label":"duplicate","secretName":"IMAGEKIT_PRIVATE_KEY_TNL"}]');
response=await request({body:{action:"accounts"}});
assert.equal(response.status,503);
env.delete("IMAGEKIT_ACCOUNTS");
env.set("IMAGEKIT_PRIVATE_KEY","legacy_private_value");
response=await request({body:{action:"accounts"}});
data=await response.json();
assert.equal(data.accounts[0].id,"default");
assert.equal(data.accounts[0].label,"Default ImageKit");
env.delete("IMAGEKIT_PRIVATE_KEY");
response=await request({body:{action:"accounts"}});
assert.equal(response.status,503);

// Pure frontend logic: account-aware deduplication, folder extraction, filter and CSV defense.
const module={exports:{}};
vm.runInNewContext(coreScript,{module,console}, {filename:"imagekit-url-core.js"});
const core=module.exports;
const merged=core.mergeAccountFiles([
  {...imageItem(1),accountId:"tgm",accountName:"Trigamma Metri"},
  {...imageItem(1),accountId:"tnl",accountName:"TNL",folderPath:"/different/"},
  {...imageItem(1),accountId:"tgm",accountName:"Trigamma Metri"},
]);
assert.equal(merged.length,2,"file IDs on separate accounts must never collide");
assert.equal(merged[0].folderPath,"/261005/sub/"===core.folderOf({filePath:"/261005/sub/example.png"})?"/261002/":"/261002/");
assert.equal(merged[1].folderPath,"/different/");
assert.equal(core.folderOf({filePath:"/261005/sub/example.png"}),"/261005/sub/");
assert.deepEqual(JSON.parse(JSON.stringify(core.uniqueFolders(merged))),["/261002/","/different/"]);
assert.equal(core.filterFiles(merged,"/different/","TNL").length,1);
assert.equal(core.filterFiles(merged,"*","Image_1").length,2);
const csv=core.toCSV([...merged,{accountId:"tgm",accountName:"X",name:"=HYPERLINK(1)",url:"https://safe.example",filePath:"/bad/evil.jpg"}]);
assert.ok(csv.startsWith("\uFEFFAccountID,AccountName,FolderPath,FileName,ImageURL"));
assert.ok(csv.includes('"\u0027=HYPERLINK(1)"'),"Excel formula must be escaped");
assert.ok(csv.includes('"tnl","TNL","/different/"'));

// Static integration checks.
assert.ok(home.includes("href: 'imagekit-url-generator.html'"));
assert.ok(ui.includes('src="imagekit-url-core.js"'));
assert.ok(ui.includes('id="accountSelect"'));
assert.ok(ui.includes('id="folderFilter"'));
assert.ok(ui.includes("core.toCSV(items)"));
assert.ok(ui.includes("core.mergeAccountFiles(items.concat(fetched))"));
assert.ok(ui.includes('id="failureBox"'));
assert.ok(ui.includes('docs/imagekit-url-generator.md'));
assert.ok(!ui.includes("api.imagekit.io"));
assert.ok(!ui.includes("IMAGEKIT_PRIVATE_KEY"));
assert.ok(ui.includes('link.rel = "noopener noreferrer"'));

console.log("✓ Tool #8 multi-account: authenticated account registry, isolated keys and failures, all-folder pagination, private media handling, CSV and UI checks");
