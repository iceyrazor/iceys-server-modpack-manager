# imporntant
note that i dont know much about security, use any of the online features of this at your own risk!

# iceys-modpack-manager
a small program i planned to make for myself. then finally made it. and decided to share. minecraft modpack manager for client and server


# what is this for? 
this is built with minecraft modding in mind

# what does this do? 
multible togglable things......

it will sync all mods FROM the server TO the client (NOT client(s)!). currently ONLY on the same machine!

it will automatacally create a zip of your modpack in the src/zip_managed folder

it has the option to run a webserver and you can port forward it if you want to. BUT keep in mind, this is not built to be 100% secure. i did my best. 
ssh is not being run

and if you want. it will automatuially move the zip to the webserver.

this can also do multible modpacks at once. witch you can disable if your not using it

and theres a client sync program that the other user can download and run to sync mods as well

# small detail?
i tried to make all the code open source even when downloaded. so that you can edit the webpage and mostly everything as you like.

# extra info
the config has some info on what all the stuff does. but if you need more detail, let me know in issues :)

this only syncs ONCE once it is ran. if you want it to sync again. close the file and reopen it.

this ONLY syncs the MODS folder. and scripts(like zs files from craftweaker), and configs. are not synced

# how do i use it?
edit the config to your liking. run the exe. 

# console output
if you have both folders set. you will see mods being added to the client. and mods being removed.

if you have zip enabled. it will tell you that the zip is done. and if you have it auto move to the server. it will tell you that it moved, in case 
you forget.

finally if you have the webserver enabled, it will show that it is running.

if you dont have the webserver running. you can close the exe once console output stops.

# possible future plans
1. allow custom synced folders and files for configs and scripts
2. allow make option to share client and config on web server
