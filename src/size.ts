import fetch from 'node-fetch';
import pckg from './package.json';

enum Color {
  Reset = "\x1b[0m",
  Bright = "\x1b[1m",
  Dim = "\x1b[2m",
  Underscore = "\x1b[4m",
  Blink = "\x1b[5m",
  Reverse = "\x1b[7m",
  Hidden = "\x1b[8m",

  FgBlack = "\x1b[30m",
  FgRed = "\x1b[31m",
  FgGreen = "\x1b[32m",
  FgYellow = "\x1b[33m",
  FgBlue = "\x1b[34m",
  FgMagenta = "\x1b[35m",
  FgCyan = "\x1b[36m",
  FgWhite = "\x1b[37m",

  BgBlack = "\x1b[40m",
  BgRed = "\x1b[41m",
  BgGreen = "\x1b[42m",
  BgYellow = "\x1b[43m",
  BgBlue = "\x1b[44m",
  BgMagenta = "\x1b[45m",
  BgCyan = "\x1b[46m",
  BgWhite = "\x1b[47m",
};


class SizeChecker {
  readonly baseurl: string;
  readonly dependecies: { [key: string]: string };
  readonly verbose: boolean;
  readonly sizeLimit: number;
  private totalSize: number;

  /**
   * 
   * @param verbose show the logs
   * @param sizeLimit size limit in bytes
   */
  constructor(verbose?: boolean, sizeLimit?: number) {
    this.baseurl = "https://bundlephobia.com/api/size?package=";
    this.totalSize = 0;
    this.dependecies = pckg.dependencies;
    this.verbose = verbose || false;
    this.sizeLimit = sizeLimit || 500000;
  }

  async fetchSize(packageName: string, packageVersion: string) {
    const url = `${this.baseurl}${packageName}@${packageVersion}`;
    const response = await fetch(url).then(res => res.json());
    this.log(`${response.name} --> ${response.size / 1000} KB`, Color.FgBlue);
    return response.size;
  }

  async main() {
    for (let [packageName, packageVersion] of Object.entries(this.dependecies)) {
      this.totalSize += await this.fetchSize(packageName, packageVersion);
    };
    const color: Color = this.sizeLimit >= this.totalSize ? Color.FgGreen : Color.FgRed;
    this.log(`Total Size: ${this.totalSize / 1000} KB`, color);
    if (color == Color.FgRed)
      return this.fail();
    return this.success();
  };

  private success() {
    this.log(`Size limit is ok! `, Color.FgGreen);
    process.exit(0);
  }

  private fail() {
    this.log(`Size limit was exceeded ${this.totalSize / 1000} KB >= ${this.sizeLimit / 1000} KB`, Color.FgRed);
    process.exit(1);
  }

  private log(data: any, color: Color) {
    if (this.verbose) {
      console.log(`${color}%s${Color.Reset}`, data);
    }
  }
}

new SizeChecker(true, 500000).main();