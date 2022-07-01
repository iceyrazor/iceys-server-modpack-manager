const path=require('path'),
	fs=require('fs'),
	http=require('http'),
    readline = require('readline'),
      consoleinput = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    }),
    main_dir=process.cwd();

console.log("welcome to icey's modpack sync client");

if(fs.existsSync(path.join(main_dir,"client_config.json"))){
    config=JSON.parse(fs.readFileSync(path.join(main_dir,"client_config.json")))
    //

    if(fs.existsSync(path.join(config.folder,"mods"))){
    let data = {}

    data.mods=fs.readdirSync(path.join(config.folder,"mods"))

    //ive only now used filter as i just remembered it exist :p
    data.mods=data.mods.filter(data_mods_first=>{
        let match=false
        config.ignore_filter.forEach(ignore_filter=>{
            if(data_mods_first==ignore_filter){
                match=true
                return
            }
        })
        if(match==false){
            return data_mods_first
        }
    })

    data.modpack=config.modpack

    data=JSON.stringify(data)
    
    const options = {
        hostname: config.server_host.split(":")[0],
        path: "/clientS_comparemods/",
        method: 'POST',
        port: parseInt(config.server_host.split(":")[1]),
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    
    let post_data_arr_in=[]
    req=http.request(options,(res)=>{
        res.on('data',chunk=>{
            post_data_arr_in.push(chunk)
        })
        res.on('end',()=>{
            data=JSON.parse(Buffer.concat(post_data_arr_in).toString())

            if(data.error){
                console.log(data.error);
            } else {
            console.log(data);
            console.log("the add part, are mods that will be added, the remove part, are mods that will");
            console.log("be removed.");
            console.log("make these changes? type y");

            let download_count=data.add.length

            consoleinput.question("input>",input=>{
                if(input=="y"){
                    data.remove.forEach(remove_mods=>{
                        fs.unlink(path.join(config.folder,"mods",remove_mods),(err)=>{console.log(err);})
                    })
                
                    if(data.add.length<1){
                        console.log("done!");
                        setTimeout(()=>{
                            process.exit()
                        },2000)
                    }
                    
                    data.add.forEach(add_mods=>{
                        let file = fs.createWriteStream(path.join(config.folder,"mods",add_mods));

                        let post_data={}
                        post_data.mod=add_mods
                        post_data.modpack=config.modpack
                    
                        post_data=JSON.stringify(post_data)

                        const options2 = {
                            hostname: config.server_host.split(":")[0],
                            path: "/clientS_getmods/",
                            method: 'POST',
                            port: parseInt(config.server_host.split(":")[1]),
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': post_data.length
                            }
                        };

                        request = http.request(options2,(response)=>{
                            response.pipe(file);
                            
                            // after download completed close filestream
                            file.on("finish", () => {
                                file.close();
                                console.log("Downloaded "+add_mods);
                                download_count--
                                console.log("remaining",download_count);
                                if(download_count<=0){
                                    console.log("done!");
                                    setTimeout(()=>{
                                        process.exit()
                                    },2000)
                                }
                            });
                        }).on("error", (err) => {
                            console.log("Error: ", err.message);
                        });

                        request.write(post_data);
                        request.end();
                    })
                } else {
                    process.exit();
                }
            });


            }
        })
    }).on("error", (err) => {
        console.log("Error: ", err.message);
    });
    
    req.write(data);
    req.end();
    } else {
        console.log("ERROR: folder "+config.folder+" does not exist!");
    }
} else {
    //if config doesnt exist. prompt user to create one
    console.log("you can right click to paste if ctrl+v does not work");
    console.log("it seems the config is mising, this is required to work, lets set it up");
    console.log("please enter the directory of your modpack folder (NOT the mods folder)");
    consoleinput.question("folder>",(folder)=>{
        let config={}
        config.folder=folder
        console.log("folder selected: "+folder);
        console.log("-------------");
        console.log("please select the host to connect to, eg host.com:2480");
        console.log("do not do http://");
        console.log("this host has to be a modpack server host");
        consoleinput.question("host>",(host)=>{
            config.server_host=host
            console.log("host: "+host);
            console.log("------------");
            console.log("now if you want, add some mods to be ignored. full name +.jar");
            console.log("these are mods that are not going to be deleted by this client");
            console.log("for example. it xaros minimap, journey map, optifine.");
            console.log("--");
            console.log("you can either do one mod at a time and hit enter");
            console.log("or do all mods in one line seperated by a , no space.");
            console.log("type end when you are done");
            console.log("-----------");
            config.ignore_filter=[]
            function conedit_add_filter(){
                console.log("----");
                config.ignore_filter.forEach((config_fill)=>{
                    console.log(config_fill);
                })
                console.log("----");
                consoleinput.question("add_ignore>",(ignore)=>{
                    if(ignore=="end"){
                        console.log("----");
                        config.ignore_filter.forEach((config_fill)=>{
                            console.log(config_fill);
                        })
                        console.log("----");
                        console.log("now, what modpack are you syncing with? enter full name");
                        consoleinput.question("modpack>",(modpack)=>{
                            config.modpack=modpack
                            console.log("config----");
                            console.log(config);
                            fs.writeFileSync(path.join(main_dir,"client_config.json"),JSON.stringify(config, undefined, 2),
                            (err)=>{
                                console.log(err);
                            })
                            console.log("thats all of the config, program will now restart");
                            console.log("simply reopen");
                            setTimeout(()=>{
                                process.exit()
                            },5000)
                        })
                    } else {
                        if(ignore.includes(",")){
                            ignore=ignore.split(",")
                            ignore.forEach(igarr=>{
                                config.ignore_filter.push(igarr)
                            })
                        } else {
                            config.ignore_filter.push(ignore)
                        }
                        conedit_add_filter()
                    }
                })
            }
            conedit_add_filter()
        })
    });
}