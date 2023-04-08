#!/usr/bin/env node

import inquirer from "inquirer";
import figlet from "figlet";
import crypto from "crypto";
import { readFileSync, write, writeFileSync } from "fs";

const algorithm = "aes256";

const encrypt = (text, password) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, password, iv);
  const encryptedMessage =
    cipher.update(text, "utf8", "hex") + cipher.final("hex");
  return iv.toString("hex") + ":" + encryptedMessage;
};

const decrypt = (text, password) => {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(algorithm, password, iv);
  const decrypted =
    decipher.update(encryptedText, "hex", "utf8") + decipher.final("utf8");
  return decrypted.toString();
};

const hash = (password) => {
  return (password = crypto
    .createHash("sha256")
    .update(String(password))
    .digest("base64")
    .substring(0, 32));
};

const setPassword = async () => {
  let { password } = await inquirer.prompt([
    {
      type: "password",
      name: "password",
      message: "Please enter a password to encrypt your environment variables",
    },
  ]);
  // open env file and add password to it
  let env = readFileSync(".env", "utf8");
  env += `
ENV_PASSWORD=${password} # Created by envcrypt
`;
  writeFileSync(".env", env);

  return hash(password);
};

async function main() {
  logSpecial("envcrypt");
  console.log(
    "Welcome to envcrypt, a tool to encrypt and decrypt environment variables."
  );
  console.log("Please select an option below:");
  const { option } = await inquirer.prompt([
    {
      type: "list",
      name: "option",
      message: "Select an option",
      choices: ["Encrypt", "Decrypt"],
    },
  ]);

  // add args to reset password

  process.argv.forEach((val, index) => {
    if (val === "--reset") {
      // delete .envcrypt file
      writeFileSync(".envcrypt", "");
    }
  });

  const { envFile } = await inquirer.prompt([
    {
      type: "input",
      name: "envFile",
      message: "Please enter the path and filename of your .env file",
      default: ".env",
    },
  ]);

  // check if env file exists
  try {
    const env = readFileSync(envFile, "utf8");
  } catch (err) {
    console.log("The file you specified does not exist.");
    // exit program as failure
    process.exit(1);
  }

  // check if there is a ENV_PASSWORD in the .env file
  let env = readFileSync(envFile, "utf8");
  let password;
  if (!env.includes("ENV_PASSWORD")) {
    console.log("No password found in .env file.");

    // set password
    password = await setPassword();
  } else {
    // get password from .env file
    password = hash(env.split("ENV_PASSWORD=")[1].split("")[0]);
  }

  if (option === "Encrypt") {
    const env = readFileSync(envFile, "utf8");
    const encrypted = encrypt(env, password);
    writeFileSync(envFile + ".encrypted", encrypted);
    console.clear();
    console.log("Your environment variables have been encrypted.");
    process.exit(0);
  } else if (option === "Decrypt") {
    const env = readFileSync(envFile + ".encrypted", "utf8");
    const decrypted = decrypt(env, password);
    writeFileSync(envFile, decrypted);
    console.clear();
    console.log("Your environment variables have been decrypted.");
    process.exit(0);
  }
}

const logSpecial = (text) => {
  console.log(
    figlet.textSync(text, {
      font: "standard",
      horizontalLayout: "default",
      verticalLayout: "default",
    })
  );
};

main();
