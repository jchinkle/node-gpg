import { GpgService } from "../lib";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const spawnGPG = (input, args = []) =>
  Promise.resolve(`gpg --batch ${args.join(" ")} "${input}"`);

describe("basedir option", () => {
  it("uses the right commands", function () {
    const gpg = new GpgService({
      spawnGPG,
      basedir: "/path/to/basedir",
    });
    return gpg
      .call("", [
        "--skip-verify",
        "--passphrase-fd",
        "0",
        "--decrypt",
        "./test/hello.gpg",
      ])
      .then((command) => {
        expect(command).to.equal(
          'gpg --batch --homedir /path/to/basedir --skip-verify --passphrase-fd 0 --decrypt ./test/hello.gpg ""'
        );
      });
  });
});
