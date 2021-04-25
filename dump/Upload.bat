@echo off

"C:\Users\barun.patro\AppData\Local\Programs\WinSCP\WinSCP.com" ^
  /command ^
    "open sftp://ubuntu@3.138.110.217/home/ubuntu/ -privatekey=""C:\Users\barun.patro\Downloads\scrapping-private-key.ppk"" -passphrase=""biki2014""" ^
    "mkdir demo" ^
    "put Reset demo.js Dockerfile init.sh LinkedIn.csv package.json XPaths.csv ./demo/" ^
    exit