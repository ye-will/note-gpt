import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Agent } from 'http';


function getProxyAgent(url?: string): Agent | undefined {
  if (url === undefined || url.length === 0) {
    return undefined;
  }
  const typ = url.split(":")[0];
  switch (typ) {
    case "http": {
      return new HttpProxyAgent(url);
    }
    case "https": {
      return new HttpsProxyAgent(url);
    }
    case "socks5":
    case "socks": {
      return new SocksProxyAgent(url);
    }
    default: {
      throw new Error("bad proxy type");
    }
  }
}

export default getProxyAgent;
