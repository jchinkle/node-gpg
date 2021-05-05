import { GpgService } from "../lib";
import fs from "fs";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const spawnGPG = (input, args = []) =>
  Promise.resolve(`gpg --batch ${args.join(" ")} "${input}"`);

describe("encrypt", function () {
  it("should encrypt data", function () {
    const gpg = new GpgService({
      spawnGPG,
    });
    return gpg
      .encrypt("Hello World", [
        "6F20F59D"
      ])
      .then((command) => {
        expect(command).to.equal(
          'gpg --batch -r 6F20F59D -a --trust-model always --encrypt "Hello World"'
        );
      });
  });

  it("should encrypt stream with encryptStream()", function () {
    const gpg = new GpgService({
      spawnGPG,
    });

    var inStream = fs.createReadStream("./test/hello.txt");

    return gpg.encryptStream(inStream, ["6F20F59D"]).then((command) => {
      expect(command).to.equal(
        'gpg --batch -r 6F20F59D -a --trust-model always --encrypt "Hello World"'
      );
    });
  });
});
