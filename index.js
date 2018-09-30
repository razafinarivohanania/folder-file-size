const spawn = require('child_process').spawn;
const fs = require('fs');
const log = require('single-line-log').stdout;

const ForlderFileSize = {
    errors: 0,
    filesFound: 0,
    fileJsonDone: 0,
    files: [],
    units: [
        'Ko',
        'Mo',
        'Go',
        'To'
    ],
    process: async () => {
        if (!ForlderFileSize.isWindows()) {
            console.error('Sorry, only Windows operating system is supported');
            exit(1);
        }

        console.log('Compute folder/file size ...');
        let partitions;
        try {
            partitions = await ForlderFileSize.getAllDiskPartitions();
        } catch (error) {
            console.error('Unable to found disk partitions');
            return;
        }

        for (partition of partitions) {
            try {
                await ForlderFileSize.readFolder(partition + ':');
            } catch (error) {
            }
        }

        ForlderFileSize.log();

        console.log('\nBuild JSON result ...\n');
        const json = ForlderFileSize.buildJsonResults();
        ForlderFileSize.logProgressBar();

        console.log('\nSort by name ...');
        ForlderFileSize.fileJsonDone = 0;
        ForlderFileSize.sort(json);

        console.log('Sort by descending size ...');
        ForlderFileSize.sort(json, (json1, json2) => json2.size.octet - json1.size.octet);

        const outputFile = 'folder-file-size.json';
        fs.writeFile(outputFile, JSON.stringify(json, null, '  '), error => {
            if (error) {
                console.error(`Unable to write result into [${outputFile}]`);
                console.error(error);
                return;
            }

            console.log(`Result JSON saved into [${outputFile}]`);
        });
    },
    isWindows: () => {
        return process.platform.includes('win');
    },
    getAllDiskPartitions: () => {
        return new Promise((resolve, reject) => {
            const cmd = spawn('cmd');
            let partitions = [];
            let error = '';

            cmd.stdout.on('data', function (data) {
                const rawPartition = '' + data;
                if (!rawPartition.includes('Name'))
                    return;

                const partitionPattern = new RegExp('([A-Z]):', 'g');
                let matchedPartition = partitionPattern.exec(rawPartition);

                while (matchedPartition != null) {
                    partitions.push(matchedPartition[1]);
                    matchedPartition = partitionPattern.exec(rawPartition);
                }

                partitions.sort();
            });

            cmd.stderr.on('data', data => error += data);

            cmd.on('exit', async () => {
                if (error != '') {
                    reject(error);
                    return;
                }

                if (partitions.length == 0) {
                    try {
                        partitions = await ForlderFileSize.getAllDiskPartitions();
                    } catch (exception) {
                        reject(exception);
                        return;
                    }
                }

                resolve(partitions);
            });

            cmd.stdin.write('wmic logicaldisk get name\n');
            cmd.stdin.end();
        });
    },
    readFolder: path => {
        return new Promise((resolve, reject) => {
            fs.readdir(path, async (error, items) => {
                if (error) {
                    ForlderFileSize.errors++;
                    reject(error);
                    return;
                }

                for (item of items) {
                    try {
                        const currentPath = path + '/' + item;
                        const stats = await ForlderFileSize.getStats(currentPath);

                        if (stats.isDirectory)
                            await ForlderFileSize.readFolder(currentPath);
                        else {
                            ForlderFileSize.filesFound++;
                            ForlderFileSize.log(987);
                            ForlderFileSize.files.push({
                                path: currentPath,
                                size: stats.size
                            });
                        }
                    } catch (exception) {
                    }
                }

                resolve();
            });
        });
    },
    log: step => {
        if (step == undefined || ForlderFileSize.filesFound % step == 0)
            log(`Errors found  : ${ForlderFileSize.errors}\nFiles treated : ${ForlderFileSize.filesFound}`);
    },
    buildProgressBar: (percent) => {
        let progressBar = '';
        const steps = 30;
        const value = steps * percent / 100;
        for (let i = 0; i < value; i++)
            progressBar += '#';

        const length = steps - progressBar.length;
        for (let i = 0; i < length; i++)
            progressBar += '-';

        return progressBar += ' ' + ForlderFileSize.scale(percent) + ' %';
    },
    logProgressBar: step => {
        if (ForlderFileSize.filesFound == 0)
            return;

        if (step == undefined || ForlderFileSize.fileJsonDone % step == 0)
            log(ForlderFileSize.buildProgressBar(ForlderFileSize.fileJsonDone * 100 / ForlderFileSize.filesFound));
    },
    buildJsonResults: () => {
        const json = [];
        ForlderFileSize.files.forEach(file => ForlderFileSize.fileToJson(
            file.path.split(/\/+/g),
            file.size,
            json)
        );
        return json;
    },
    sort: (json, sortFunction) => {
        if (json == undefined)
            return;

        json.sort(sortFunction);

        for (const i in json)
            ForlderFileSize.sort(json[i].sub, sortFunction);
    },
    getStats: path => {
        return new Promise((resolve, reject) => {
            fs.stat(path, (error, stats) => {
                if (error) {
                    ForlderFileSize.errors++;
                    reject(error);
                    return;
                }

                resolve({
                    isDirectory: stats.isDirectory(),
                    size: stats.size
                });
            })
        });
    },
    fileToJson: (paths, size, json) => {
        if (paths.length == 0)
            return;

        for (let i in json) {
            if (json[i].path != paths[0])
                continue;

            const newSize = json[i].size.octet + size;
            json[i].size = {
                octet: newSize,
                string: ForlderFileSize.sizeToString(newSize)
            }

            const subPaths = paths.length > 1 ?
                paths.splice(1) :
                [];

            return ForlderFileSize.fileToJson(subPaths, size, json[i].sub);
        }

        json.push({
            path: paths[0],
            size: {
                octet: size,
                string: ForlderFileSize.sizeToString(size)
            }
        });

        if (paths.length != 1) {
            const last = json.length - 1;
            json[last].sub = [];

            const subPaths = paths.length > 1 ?
                paths.splice(1) :
                [];

            return ForlderFileSize.fileToJson(subPaths, size, json[last].sub);
        }

        ForlderFileSize.fileJsonDone++;
        ForlderFileSize.logProgressBar(987);
    },
    sizeToString: size => {
        for (let i = ForlderFileSize.units.length - 1; i >= 0; i--) {
            if (('' + size).length >= ((i + 1) * 3) + 1) {
                size = size / (Math.pow(1024, i + 1));
                return ForlderFileSize.scale(size) + ' ' + ForlderFileSize.units[i];
            }
        }

        return size + ' o';
    },
    scale: size => {
        size = '' + size;
        const dot = size.indexOf('.');

        if (dot >= 0)
            size = size.substr(0, dot + 3);

        return size;
    }
};

(async () => ForlderFileSize.process())();
