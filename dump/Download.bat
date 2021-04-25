@echo off

"C:\Users\barun.patro\AppData\Local\Programs\WinSCP\WinSCP.com" ^
  /command ^
    "open sftp://ubuntu@3.138.110.217/home/ubuntu/ -privatekey=""C:\Users\barun.patro\Downloads\scrapping-private-key.ppk"" -passphrase=""biki2014""" ^
    "get -delete demo_1 demo_2 .\dump\Ubuntu\1\10th Nov" ^
    exit