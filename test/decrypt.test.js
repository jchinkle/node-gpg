import { GpgService } from "../lib";
import fs from "fs";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const spawnGPG = (input, args = []) =>
  Promise.resolve(`gpg --batch ${args.join(" ")} "${input}"`);

const encryptedString = `TEST ENCRYPTED STRING`;

describe("decrypt", function () {
  it("should decrypt strings", function () {
    const gpg = new GpgService({
      spawnGPG,
      writer: {
        writeFile: () => Promise.resolve(),
        unlink: () => Promise.resolve(),
      },
      tempFolderPath: "./",
      idFactoryFn: () => "test-uuid"
    });
    return gpg
      .decrypt(encryptedString, "test-passphrase")
      .then((command) =>
        expect(command).to.equal(
          'gpg --batch --no-tty --logger-fd 1 --quiet --passphrase-fd 0 --pinentry-mode loopback --decrypt test-uuid.txt "test-passphrase"'
        )
      );
  });

  it("should decrypt stream with decryptStream()", function () {
    const gpg = new GpgService({
      spawnGPG,
      writer: {
        writeFile: () => Promise.resolve(),
        unlink: Promise.resolve(),
      },
      tempFolderPath: "./",
      idFactoryFn: () => "test-uuid"
    });
    var inStream = fs.createReadStream("./test/hello.gpg");

    gpg.decryptStream(inStream, "test-passphrase").then((command) => {
      expect(command).to.equal("");
    });
  });
});
