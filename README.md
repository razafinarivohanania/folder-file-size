# 1. What is it used for?

This program allows to retrieve all folders and files size for all partitions avalaible. Output is sorted by descending size followed by name ordering.

NB : Only Windows operation system is supported.

# 2. How to run it?

Clone the project from git or clone zip file and unzip it. Once done, run the foolowing command line to install all dependencies :

```sh
$ node install
```

Then, run and wait until it has finished the job :

```sh
$ node index
```

Console log will be :

```sh
Compute folder/file size ...
Errors found  : 489
Files treated : 324011
Build JSON result ...
############################## 100 %
Sort by name ...
Sort by descending size ...
Result JSON saved into [folder-file-size.json]
```

NB : Errors found means that a problem was occured when the program attempts to read the current folder/file. Most of the time, it is not authorised to read folder/property. Often occured on operation system folder. It is recommended to run program as administrator.

# 3. What i get after?

When all thing is done, a file *folder-file-size.json* will be created. Beware, output file can be heavy depending all files found on all partitions. Its structure is like this :

```json
[
  {
    "path": "D:",
    "size": {
      "octet": 1024,
      "string": "1 K0"
    },
    "sub": [
      {
        "path": "file",
        "size": {
          "octet": 1024,
          "string": "1 Ko"
        }
      }
    ]
  },
  {
    "path": "E:",
    "size": {
      "octet": 1024,
      "string": "1 Ko"
    },
    "sub": [
      {
        "path": "file",
        "size": {
          "octet": 1024,
          "string": "1 Ko"
        }
      }
    ]
  }
]
```