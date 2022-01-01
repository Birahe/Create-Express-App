import chalk from "chalk";
import fs from 'fs';
import {ncp} from 'ncp';
import path from "path";
import {promisify} from 'util'
import Listr from 'listr';
import simpleGit from 'simple-git';
import { projectInstall } from "pkg-install";

const access = promisify(fs.access);
const copy = promisify(ncp);

async function copyTemplate({templateDirectory, targetDirectory}) {
    return copy(templateDirectory, targetDirectory)
}

export async function createProject(options) {
    options = {
        ...options,
        targetDirectory: options.targetDirectory || process.cwd()
    }

    const currentFileUrl = import.meta.url;
    const templateDir = path.resolve(path.resolve(new URL(currentFileUrl).pathname, '../../templates').split('\\').slice(1).join("\\"), options.template.toLowerCase());
    options.templateDirectory = templateDir;

    try {
        await access(templateDir, fs.constants.R_OK);
    } catch (e) {
        console.error("%s Invalid Template Name", chalk.red.bold('ERROR'))
        console.log(e)
        process.exit(1);
    }

    const tasks = new Listr([
        {
            title: "Copy Project Files",
            task: () => copyTemplate(options),
        },
        {
            title: "Install Dependencies",
            task: () => projectInstall({
                cwd: options.targetDirectory
            }),
            skip: () => !options.runInstall ? "Pass --install to automatically install dependencies." : undefined,
        },
        {
            title: "Initialize Git",
            task:() => initGit(options),
            enabled: () => options.git,
        },
    ]);

    tasks.run().then(() => console.log("%s Project Ready!", chalk.green.bold('DONE')))

    return true;
}

async function initGit(options) {
    const git = simpleGit();
    try {
        await git.init();
        fs.writeFile('.gitignore', 'node_modules \npackage-lock.json\n.env',function (e) {
            console.log(e);
        })
        await git.add(".")
        await git.commit("Initialize Commit")
        return true
    } catch (e) {
        console.log(e);
        return Promise.reject(new Error('Failed to initialize Git.'))
    }
}