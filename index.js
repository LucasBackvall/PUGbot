const util = require("util");
const Discord = require("discord.js");
const client = new Discord.Client();
const fs = require('fs');
const pugs = require('./pugs.json');


// Authentication
try{
	const auth = require("./auth.json")
	client.login(auth.token);
	console.log("Authenticated.");
} catch (err) {
	const readline = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});
	readline.question("What is your bot token?\n", token => {
		client.login(token);
		console.log("Authenticated.");
		readline.close();
	});
}


const prefix = ".";
const colums = false;
var data = {};
var timer = {};

function resetTimer(guild) {
	timer[guild] = false
}

function printPUG(guild, i) {
	let msg = pugs[i].name
	while (msg.length < 3) { msg += " ";}
	// \uD83C\uDF00 
	msg += " (" + data[guild].players[i].length + "/" + pugs[i].max + "): ";
	let first = true;
	allPlayers(guild)[i].forEach(function (player) {
		if (first) {msg += player.username;first=false;}
		else {msg += ", " + player.username;}
	});
	return msg;
}


function getUser(mention) {
	if (!mention) return;
	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);
		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}
		return client.users.get(mention);
	}
}


function fromChannel(channelObj) {
	channel = channelObj.toString()
	if (channel.startsWith('<#') && channel.endsWith('>')) {
		channel = channel.slice(2, -1);
		if (channel.startsWith('!')) {
			channel = channel.slice(1);
		}
		return channel;
	}
}


function toChannel(channel) {
	return client.channels.get(channel)
}


function fromPlayers(lists) {
	let out = [];
	lists.forEach(function (list) {
		let olist = [];
		list.forEach(function (player) {
			olist.push(player.id);
		});
		out.push(olist);
	});
	return out;
}


function toPlayers(lists) {
	let out = [];
	lists.forEach(function (list) {
		let olist = [];
		list.forEach(function (userid) {
			olist.push(client.users.get(userid));
		});
		out.push(olist);
	});
	return out;
}

function allPlayers(guild) {
	return toPlayers(data[guild].players);
}


function removePlayer(guild, i, userid) {
	let j = data[guild].players[i].indexOf(userid);
	if (j != -1) {
		data[guild].players[i].splice(j, 1);
		return true;
	}
	return false;
}


function removePlayerAll(guild, userid) {
	let removed = false;
	for (let i = 0; i < pugs.length; i++) {
		removed = removePlayer(guild, i, userid) || removed;
	}
	return removed
}


function listactive(guild) {
	let anyone = false;
	for (let i = 0; i < data[guild].players.length; i++) {
		if (data[guild].players[i].length > 0) {anyone = true;}
	}
	if (!anyone) {
		return "There is currently nobody registered for a PUG.";
	}
	let msg = "```fix\nAll PUGs with registered players:\n";
	for (let i = 0; i < pugs.length; i++) {
		if (data[guild].players[i].length > 0) {
			msg += "\n" + printPUG(guild, i);
		}
	}
	return msg + "```"
}


function updateLast(guild, players, pug) {
	data[guild].last = "Last game:\n\n**"+pug.name+"** with: ";
	let first = true;
	players.forEach(function (player) {
		if (first) {data[guild].last += "**"+player.username+"**";first=false;}
		else {data[guild].last += ", " + "**"+player.username+"**";}
	});
}


function writeData() {
	fs.writeFile('./data.json', JSON.stringify(data), (err) => {
		if (err) throw err;
		console.log("Write successfull.");
	});
	return true;
}

function onLeave(oldMember, newMember) {
	let guild = newMember.guild.id;
	if (newMember.presence.status == "offline") {
		if (removePlayerAll(guild, newMember.user.id) && data[guild].ch != ".") {
			ch.send("Removed "+oldMember.user.username+" from all lists because he/she went offline.\n\n"+listactive(guild));
			console.log("Removed "+oldMember.user.username+" from all lists because he/she went offline.");
			writeData();
		}
	}

}


function onMessage(message) {
	try{
		// DM commands are disallowed so you can't enter a list without people seeing it.
		// It also simplifies letting me define guild up top
		// TODO: Allow some commands in DM. 
		// If a report system is implemented you should be able to report players in DM to bot.
		if (message.channel.type != "text") return;
		let sender = message.author;
		let guild = message.guild.id;
		
		// Ignore messages that arent commands or that's recieved from bots
		if (!message.content.startsWith(prefix) || sender.bot) return;
		
		// Ignore messages that's recieved from banned players
		if (message.member.roles.some(role => role.name === "PUGbanned")) return;
		
		const args = message.content.slice(prefix.length).split(/ +/);
		const command = args.shift().toLowerCase();
		
		// If this is the first interaction with a guild:
		// create new data-entry for guild.
		try {
			let _test = data[guild].channel;
		} catch(err) {
			data[guild] =
				{
					"players": [],
					"last": "No games since bot was started.",
					"invite": ".",
					"channel":"."
				}
			pugs.forEach(function(pug) {
				data[guild].players.push(new Array());
			});
			console.log("New Guild!\n\n" + util.inspect(data));
			writeData();
		}
		if (timer[guild] == undefined) {
			console.log("Created timer for guild.");
			timer[guild] = false;
		}
		
		// Disallow commands outside of specified channel unless it's the setchannel command.
		if (command != "setchannel" && data[guild].channel != "." && toChannel(data[guild].channel) != message.channel) return;
		
		console.log(sender.username + ": " + command +" ("+ args + ")")	
		
		switch (command) {
			
			// Display helpmessage
			case "help":
				let rich = new Discord.RichEmbed()
					.setColor("#FA6607")
					.setTitle("Available PUGs:")
				pugs.forEach(function(pug) {
					rich.addField("**"+pug.name+"**", pug.info + " - do '.j "+pug.name+"' to join!")
				});
				message.channel.send(rich);
				rich = new Discord.RichEmbed()
					.setColor("#FA6607")
					.setTitle("Available commands:")
					.addField(prefix + "help", "Show this message.", colums)
					.addField(prefix + "list", prefix + "ls for short. Show all PUGs that you can join.", colums)
					.addField(prefix + "listactive", prefix + "lsa for short. Show all PUGs you can join that already have registered players.", colums)
					.addField(prefix + "last", "Show last filled PUG with it's players.", colums)
					.addField(prefix + "join <PUGs>", prefix + "j for short. Join one or several PUGs. For example: both '.join 2v2 3v3' and '.j 2v2 3v3' would join both 2v2 and 3v3.", colums)
					.addField(prefix + "leave <PUGs>", prefix + "lv for short. Leave one or several PUGs. For example both '.leave 2v2 3v3' and '.lv 2v2 3v3' would leave both 2v2 and 3v3.", colums)
					.addField(prefix + "leaveall", prefix + "lva for short. Leave all PUGs you're registered to.", colums)
					.addField(prefix + "invite", prefix + "inv for short. Get the invite link sent in chat to invite your friends to this community!", colums)
					.addField(prefix + "promote (PUGs)", prefix +"p for short. Promote one or more PUGs. If you don't specify any PUGs all PUGs with registered players will be promoted.")
				message.channel.send(rich);
				if (message.member.roles.some(role => role.name === "PUGadmin")) {
					rich = new Discord.RichEmbed()
						.setColor("#FA6607")
						.setTitle("Available administrator commands:")
						.addField(prefix + "reset", "Resets all PUGs.", colums)
						.addField(prefix + "adminadd <user> <PUGs>", "Add user to one or several PUGs. For example: '.adminadd @LurreB 2v2 3v3'", colums)
						.addField(prefix + "adminremove <user> <PUGs>", "Remove user from one or several PUGs. For example: '.adminremove @LurreB 2v2 3v3'", colums)
						.addField(prefix + "adminremoveall <user>", "Remove user from all PUGs. For example: '.adminremoveall @LurreB'", colums)
						.addField(prefix + "setchannel", "Sets the current channel as the channel the bot will listen to and respond in.", colums)
						.addField(prefix + "resetchannel", "Allows the bot to listen to and respond in any channel.", colums)
						.addField(prefix + "setinvite <link>", "Set the new invite link.", colums)
					sender.createDM().then(function(channel) {
						channel.send(rich);
					}, function(err) {
						console.log("Couldn't send admincommands as DM.\n\n" + err)
						message.channel.send(rich);
					});
				}
				break;
			

			case "invite":
			case "inv":
				if (data[guild].link == ".") message.channel.send("No invite link is set. Tell an administrator!")
				else message.channel.send("Invite link:\n" + data[guild].link);
				break;
			
			
			case "setinvite":
				data[guild].link = args[0];
				if (writeData()) message.channel.send("New invite link set!")
				else message.channel.send("Unable to write invite link to disk.");
				break;
			
			
			// Reset PUGs (default is all PUGs)
			case "reset":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				if(args.length == 0) {
					 for (let i = 0; i < pugs.length; i++) {
						data[guild].players[i] = new Array();
					}
					message.channel.send("All PUGs reset!");
				} else {
					args.forEach(function(arg) {
						for (let i = 0; i < pugs.length; i++) {
							if (pugs[i].name == arg) {
								message.channel.send("**" +pugs[i].name+ "** reset!");
								data[guild].players[i] = new Array();
							}
						}
					});
				}
				writeData();
				break;
			
			
			// Allow the bot to use any channel
			case "resetchannel":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				data[guild].channel = ".";
				if (writeData()) message.channel.send("I will now operate in any channel.")
				else message.channel.send("Unable to write new operating channel to disk. Will operate in any channel untill I'm restarted.");
				break;
			
			
			// Set current channel to the operating channel of the bot.
			case "setchannel":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				data[guild].channel = fromChannel(message.channel);
				if (writeData()) message.channel.send("I will now operate in this channel.")
				else message.channel.send("Unable to write new operating channel to disk. Will operate here untill I'm restarted.");
				break;
			
			
			// Add another user to PUG
			case "adminadd":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				sender = getUser(args[0]);
				args.splice(0, 1);
				try {
					let test = sender.username;
				} catch (err) {
					message.channel.send("Tried to add non-user to PUG.");
					break;
				}
				
			
			// Join a PUG
			case "join":
			case "j":
				let lfg = true;
				// For each PUG
				for (let i = 0; i < pugs.length; i++) {
					// If PUG is in message argument and we're still looking for a group (lfg)
					//	 If a player finds a game, they're no longer looking for a group (lfg)
					if (args.indexOf(pugs[i].name) != -1 && lfg) {
						// If player isn't in PUG
						if (allPlayers(guild)[i].indexOf(sender) == -1) {
							// If that PUG is now full (push returns new length of array)
							if (data[guild].players[i].push(sender.id) >= pugs[i].max) {
								lfg = false; // Not looking for a group anymore
								updateLast(guild, data[guild].players[i], pugs[i]);
								let msg = "Found a game!\n\n**"+pugs[i].name+"** is filled! All players (**"+allPlayers(guild)[i]+"**) please join a voice channel together.";
								msg += "\n\nYou have all been automatically removed from all other playlists."
								message.channel.send(msg);
								while (data[guild].players[i].length > 0) {
									participant = data[guild].players[i][0]; 
									removePlayerAll(guild, participant);
									if (participant == client.user.id) continue;
									client.users.get(participant).createDM().then(function(channel) {
										channel.send(msg);
									}, function(err) {
										console.log("Couldn't send found game DM to ." + participant.username);
									});
								}
								break;
							}
						// If player already in PUG
						} else {
							message.channel.send("You're already in list **" + pugs[i].name + "**");
						}
					}
				}
				if (lfg) {
					message.channel.send(listactive(guild));
				}
				writeData();
				break;
			
			
			// Remove another user from all PUGs
			case "adminremoveall":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				sender = getUser(args[0]);
			
			
			// Leave all PUGs
			case "lva":
				removePlayerAll(guild, sender.id);
				//message.channel.send("Removed **" + sender + "** from all lists.");
				message.channel.send(listactive(guild));
				writeData();
				break;
			
			
			// Remove another user from a PUG
			case "adminremove":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				sender = getUser(args[0]);
				args.splice(0, 1);
		
			
			// Leave a PUG
			case "leave":
			case "lv":
				args.forEach(function (pugname) {
					for (let i = 0; i < pugs.length; i++) {
						if (pugs[i].name == pugname) {
							removePlayer(guild, i, sender.id);
							//message.channel.send("Removed **" + sender + "** from **" + pugname + "**");
						}
					}
					console.log("\n\n");
				});
				message.channel.send(listactive(guild));
				writeData();
				break;
			
			
			case "promote":
			case "p":
				if (timer[guild] == true) {
					message.channel.send("Can't promote again yet.");
					break;
				}
				if (args.length == 0) message.channel.send("@here\n" + listactive(guild))
				else {
					let msg = "@here\n```fix\nFollowing PUG(s) were promoted by "+sender.username+"\n";
					args.forEach(function (arg) {
						for (let i = 0; i < pugs.length; i++) {
							if (pugs[i].name == arg) msg += "\n" + printPUG(guild, i)
						}
					});
					msg += "```";
					message.channel.send(msg);
				}
				timer[guild] = true;
				setTimeout(resetTimer, 10*60*1000, guild);
				break;
			
			
			// List all PUGs with players registered
			case "listactive":
			case "lsa":
				message.channel.send(listactive(guild));
				break;
			
			
			// List all PUGs
			case "list":
			case "ls":
				let msg = "```fix\nAll PUGs:\n";
				for (let i = 0; i < pugs.length; i++) {
					msg += "\n" + printPUG(guild, i);
				}
				message.channel.send(msg + "```");
				break;
			
			
			// Repeat last PUG
			case "last":
				message.channel.send(data[guild].last);
				break;
		}
	} catch (err) {
		console.log("Error parsing this command.\n\n" + err);
	}
}


client.once("ready", () => {
	fs.readFile('data.json', (err, d) => {
		if (err) {
			if (err == "Error: ENOENT: no such file or directory, open 'data.json'") {
				console.log("No data.json found. Creating a new one...");
				writeData();
				return;
			}
			else throw err;
		}
		data = JSON.parse(d);
	});
	console.log("Bot started.");
});

client.on("message", message => {
	onMessage(message);
});

client.on("messageUpdate", (oldMessage, newMessage) => {
	onMessage(newMessage);
});

client.on("presenceUpdate", (oldMember, newMember) => {
	onLeave(oldMember, newMember);
});

client.on("guildMemberAdd", (guildMember) => {
	let rich = new Discord.RichEmbed()
		.setColor("#FA6607")
		.setTitle("Welcome to StarCraft 2 Universe!")
		.setImage("https://media.discordapp.net/attachments/620428169442492417/628655402384621578/7f720d246ac5f7b79b03ae6c31a75645--starcraft--logodesign.jpg")
		.setThumbnail("https://cdn.discordapp.com/attachments/620428169442492417/630935040884211722/SC22222---roood222.jpg")
		.addField("This server is using a PUG bot (Me!) you can find me in the channel #"+ch.name+" on the server.", "For more info, write .help in "+ch, colums)
	guildMember.user.createDM().then(function(channel) {
		channel.send(rich);
		console.log("Sent welcome message to "+guildMember.user.username);
	}, function(err) {
		console.log("Couldn't send welcome message to "+guildMember.user.username+"\n\n" + err)
	});
});

