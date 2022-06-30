const express=require('express'),
	app = express(),
	fs=require('fs'),
	path=require('path'),
	JSZip = require('jszip'),
	webdir=path.join(process.cwd(),"src","web");

const zip = new JSZip();
////////
//time format function because it just has to be complicated
function changeTimezone(date, ianatz) {

  // suppose the date is 12:00 UTC
  let invdate = new Date(date.toLocaleString('en-US', {
    timeZone: ianatz
  }));

  // then invdate will be 07:00 in Toronto
  // and the diff is 5 hours
  let diff = date.getTime() - invdate.getTime();

  // so 12:00 in Toronto is 17:00 UTC
  return new Date(date.getTime() - diff); // needs to substract

}


//get config
if(fs.existsSync(path.join(process.cwd(),"src","config.json"))){
	config=JSON.parse(fs.readFileSync(path.join(process.cwd(),"src","config.json")))
} else {
	console.log("ERROR: config does not exist!");
	process.exit()
}

function server_to_client_sync(modpack){
	let mod_list={client_mods:[],server_mods:[],diff:{add:[],remove:[]}}
	mod_list.server_mods=fs.readdirSync(path.join(modpack.server_folder,"mods"))
	mod_list.client_mods=fs.readdirSync(path.join(modpack.client_folder,"mods"))

	mod_list.server_mods.forEach(mods=>{
		let match=false
		mod_list.client_mods.forEach(cmods=>{
			if(mods==cmods){
				match=true
			}
		})
		modpack.server_ignore_filter.forEach(igmods=>{
			if(mods==igmods){
				match=true
			}
		})
		if(match==false){
			mod_list.diff.add.push(mods)
		}
	})

	mod_list.client_mods.forEach(mods=>{
		let match=false
		mod_list.server_mods.forEach(cmods=>{
			if(mods==cmods){
				match=true
			}
		})
		modpack.client_ignore_filter.forEach(igmods=>{
			if(mods==igmods){
				match=true
			}
		})
		if(match==false){
			mod_list.diff.remove.push(mods)
		}
	})
	console.log(mod_list.diff);

	mod_list.diff.remove.forEach(remove_mods=>{
		fs.unlink(path.join(modpack.client_folder,"mods",remove_mods),(err)=>{console.log(err);})
	})

	mod_list.diff.add.forEach(add_mods=>{
		fs.copyFileSync(path.join(modpack.server_folder,"mods",add_mods),path.join(modpack.client_folder,"mods",add_mods))
	})

	mod_list={}
}

//does both client and server folder exist on same machine? and is said modpack active? sync it!
config.modpacks.forEach(modpacks=>{
	if(modpacks.active==true&&modpacks.server_folder&&modpacks.client_folder){
		server_to_client_sync(modpacks)
	}
})


//zip de file
config.modpacks.forEach(modpacks=>{
	if(modpacks.active==true&&modpacks.compile_zip==true){
		try {
			let zip_path=path.join("src","zip_managed",modpacks.name+".zip")
			if(fs.existsSync(zip_path)){
				 fs.unlinkSync(zip_path)
			}
			if(fs.existsSync(path.join("src","web","modpacks",modpacks.name+".zip"))&&modpacks.move_zip_to_server==true){
				 fs.unlinkSync(path.join("src","web","modpacks",modpacks.name+".zip"))
			}
			let mod_com_list=fs.readdirSync(path.join(modpacks.zip_folder,"mods"))

			mod_com_list.forEach(mod_name=>{
				let ignore_file=false
				modpacks.zip_ignore_filter.forEach(igmods=>{
					if(mod_name==igmods){
						ignore_file=true
					}
				})

				if(ignore_file==false){
	    			const pdfData = fs.readFileSync(path.join(modpacks.zip_folder,"mods",mod_name));
	    			zip.file(mod_name, pdfData);
    			}
    		})
		
			setTimeout(()=>{
    		zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
			.pipe(fs.createWriteStream(zip_path))
			.on('finish', function () {
			    console.log(modpacks.name+".zip written.");
			    move_file_to_web(modpacks)
			});
			},1000);
		} catch (err) {
    		console.error(err)
		}
	}
})

//move to web
function move_file_to_web(modpacks){
	if(modpacks.move_zip_to_server==true){
		console.log(modpacks.name+".zip moved to server folder");
		fs.renameSync(path.join("src","zip_managed",modpacks.name+".zip"),path.join("src","web","modpacks",modpacks.name+".zip"))
	}
}


//run webserver
if(config.use_webserver==true){
	app.use(express.urlencoded({ extended: true }));
	app.use(express.json());
	app.use(express.text());

	app.use(function(req,res,next){
	  server_log = function server_log(str){
	    let newDate=changeTimezone(new Date(),"US/Central");
	    let date={
	      day:(newDate.getMonth()+1)+" "+newDate.getDate()+" "+newDate.getFullYear(),
	      time:newDate.getHours()+":"+newDate.getMinutes()+":"+newDate.getSeconds()
	    }
	    let logfile=path.resolve("src","logs",date.day+".txt")
	    let content="--"+date.time+": "+"hostname: "+req.socket.remoteAddress+" url: "+req.url+"\n"+str+"\n"
	    console.log(content)
	    fs.writeFile(logfile,content,{flag:'a+'},err=>{if(err){server_log(err)}})
	  }
	  next();
	})

	app.use(function(req,res,next){
  		req.checkdir = function checkdir(des_dir,curr_dir){
  		  let isdir=path.resolve(webdir,curr_dir.replace(/^\//g,"")).includes(path.join(webdir,des_dir))
  		  if(isdir==false){
  		    server_log("out of dir at: "+curr_dir)
  		    res.send("access denied")
  		  }
  		  return isdir
  		}
  		next();
	});

	app.get("/modpacks/*",function(req,res){
		req.url=req.url.replace(/%20/g," ");
		if(req.checkdir("modpacks",req.url)==true){
			res.sendFile(path.join(webdir,req.url))
		}
	});

	app.get("/modpacklist",function(req,res){
		res.send(fs.readdirSync(path.join(webdir,"modpacks")))
	})

	if(config.enable_client_server_sync==true){
		app.post("/clientS_comparemods",function(req,res){
			config.modpacks.forEach(modpacks=>{
				if(modpacks.active==true&&modpacks.name==req.body.modpack&&modpacks.use_client_sync==true){
					let mod_list={client_mods:[],server_mods:[],diff:{add:[],remove:[]}}
					mod_list.server_mods=fs.readdirSync(path.join(modpacks.client_sync_folder,"mods"))
					mod_list.client_mods=req.body.mods
				
					mod_list.server_mods.forEach(mods=>{
						let match=false
						mod_list.client_mods.forEach(cmods=>{
							if(mods==cmods){
								match=true
							}
						})
						modpacks.client_sync_ignore_filter.forEach(igmods=>{
							if(mods==igmods){
								match=true
							}
						})
						if(match==false){
							mod_list.diff.add.push(mods)
						}
					})
				
					mod_list.client_mods.forEach(mods=>{
						let match=false
						mod_list.server_mods.forEach(cmods=>{
							if(mods==cmods){
								match=true
							}
						})
						if(match==false){
							mod_list.diff.remove.push(mods)
						}
					})
					res.send(JSON.stringify(mod_list.diff))
				} else {
					res.send(JSON.stringify({error:"modpack does not exist"}))
				}
			})

		})

		app.post("/clientS_getmods",function(req,res){
			config.modpacks.forEach(modpacks=>{
				if(modpacks.active==true&&modpacks.name==req.body.modpack&&modpacks.use_client_sync==true){
					res.sendFile(path.join(modpacks.client_sync_folder,"mods",req.body.mod))
				} else {
					res.send(JSON.stringify({error:"modpack does not exist"}))
				}
			});


		});
	} else {
		app.post("/clientS_comparemods",function(req,res){
			res.send(JSON.stringify({error:"sync is not enabled"}))
		});
		
		app.post("/clientS_getmods",function(req,res){
			res.send(JSON.stringify({error:"sync is not enabled"}))
		});
	}

	app.get("/*",function(req,res){
		res.sendFile(path.join(process.cwd(),"src","web","index.html"))
	})



	let port=config.server_port
	app.listen(port,'0.0.0.0', () => {
	  console.log(`Example app listening at http://localhost:${port}`)
	});
}