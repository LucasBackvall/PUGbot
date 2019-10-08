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


var ch = "."
var link = "."
var last = "No games since bot was started."
var players = [];
for (var i = 0; i < pugs.length; i++) {
	players.push(new Array());
}


function printPUG(i) {
	var msg = pugs[i].name
	while (msg.length < 3) { msg += " ";}
	// \uD83C\uDF00 
	msg += " (" + players[i].length + "/" + pugs[i].max + "): ";
	var first = true;
	players[i].forEach(function (player) {
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
	var out = [];
	lists.forEach(function (list) {
		var olist = [];
		list.forEach(function (player) {
			olist.push(player.id);
		});
		out.push(olist);
	});
	return out;
}


function toPlayers(lists) {
	var out = [];
	lists.forEach(function (list) {
		var olist = [];
		list.forEach(function (id) {
			olist.push(client.users.get(id));
		});
		out.push(olist);
	});
	return out;
}


function removePlayer(i, name) {
	if (players[i] == undefined) {return;}
	var j = players[i].indexOf(name)
	if (j != -1) {
		players[i].splice(j, 1);
		return true;
	}
	return false;
}


function removePlayerAll(name) {
	var removed = false;
	for (var i = 0; i < pugs.length; i++) {
		removed = removePlayer(i, name) || removed;
	}
	return removed
}


function listactive() {
	var anyone = false;
	for (var i = 0; i < players.length; i++) {
		if (players[i].length > 0) {anyone = true;}
	}
	if (!anyone) {
		return "There is currently nobody registered for a PUG.";
	}
	var msg = "```fix\nAll PUGs with registered players:\n";
	for (var i = 0; i < pugs.length; i++) {
		if (players[i].length > 0) {
			msg += "\n" + printPUG(i);
		}
	}
	return msg + "```"
}


function updateLast(players, pug) {
	last = "Last game:\n\n**"+pug.name+"** with: ";
	var first = true;
	players.forEach(function (player) {
		if (first) {last += "**"+player.username+"**";first=false;}
		else {last += ", " + "**"+player.username+"**";;}
	});
}


function writeData() {
	let data = {players: fromPlayers(players), last: last, invite: link, channel: fromChannel(ch)}
	fs.writeFile('./data.json', JSON.stringify(data), (err) => {
		if (err) throw err;
		console.log("Write successfull.");
	});
	return true;
}


function onMessage(message) {
	try{
		var sender = message.author;
		
		// Ignore messages that arent commands or that's recieved from bots
		if (!message.content.startsWith(prefix) || sender.bot) return;
		
		// Ignore messages that's recieved from banned players
		if (message.member.roles.some(role => role.name === "PUGbanned")) return;
		
		const args = message.content.slice(prefix.length).split(/ +/);
		const command = args.shift().toLowerCase();
		
		// Disallow commands outside of specified channel unless it's the setchannel command.
		// DM commands are also disallowed so you can't enter a list without people seeing it.
		// TODO: Allow some commands in DM. 
		// If a report system is implemented you should be able to report players in DM to bot.
		if (message.channel.type != "text" || command != "setchannel" && ch != "." && ch != message.channel) return;
		
		console.log(sender.username + ": " + command +" ("+ args + ")")	
		
		switch (command) {
			
			// Display helpmessage
			case "help":
				var rich = new Discord.RichEmbed()
					.setColor("#FA6607")
					.setTitle("Available PUGs:")
				pugs.forEach(function(pug) {
					rich.addField("**"+pug.name+"**", pug.info + " - do '.j "+pug.name+"' to join!")
				});
				message.channel.send(rich);
				var rich = new Discord.RichEmbed()
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
					var rich = new Discord.RichEmbed()
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
				if (link == ".") message.channel.send("No invite link is set. Tell an administrator!")
				else message.channel.send("Invite link:\n" + link);
				break;
			
			
			case "setinvite":
				link = args[0];
				if (writeData()) message.channel.send("New invite link set!")
				else message.channel.send("Unable to write invite link to disk.");
				break;
			
			
			// Reset PUGs (default is all PUGs)
			case "reset":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				if(args.length == 0) {
					 for (var i = 0; i < pugs.length; i++) {
						players[i] = new Array();
					}
					message.channel.send("All PUGs reset!");
				} else {
					args.forEach(function(arg) {
						for (var i = 0; i < pugs.length; i++) {
							if (pugs[i].name == arg) {
								message.channel.send("**" +pugs[i].name+ "** reset!");
								players[i] = new Array();
							}
						}
					});
				}
				writeData();
				break;
			
			
			// Allow the bot to use any channel
			case "resetchannel":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				ch = ".";
				if (writeData()) message.channel.send("I will now operate in any channel.")
				else message.channel.send("Unable to write new operating channel to disk. Will operate in any channel untill I'm restarted.");
				break;
			
			
			// Set current channel to the operating channel of the bot.
			case "setchannel":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				ch = message.channel;
				if (writeData()) message.channel.send("I will now operate in this channel.")
				else message.channel.send("Unable to write new operating channel to disk. Will operate here untill I'm restarted.");
				break;
			
			
			// Add another user to PUG
			case "adminadd":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				sender = getUser(args[0]);
				args.splice(0, 1);
				try {
					var test = sender.username;
				} catch (err) {
					message.channel.send("Tried to add non-user to PUG.");
					break;
				}
				
			
			// Join a PUG
			case "join":
			case "j":
				var lfg = true;
				// For each PUG
				for (var i = 0; i < pugs.length; i++) {
					// If PUG is in message argument and we're still looking for a group (lfg)
					//	 If a player finds a game, they're no longer looking for a group (lfg)
					if (args.indexOf(pugs[i].name) != -1 && lfg) {
						// If player isn't in PUG
						if (players[i].indexOf(sender) == -1) {
							// If that PUG is now full (push returns new length of array)
							if (players[i].push(sender) >= pugs[i].max) {
								lfg = false; // Not looking for a group anymore
								updateLast(players[i], pugs[i]);
								var msg = "Found a game!\n\n**"+pugs[i].name+"** is filled! All players (**"+players[i]+"**) please join a voice channel together.";
								msg += "\n\nYou have all been automatically removed from all other playlists."
								message.channel.send(msg);
								sender.createDM().then(function(channel) {
									channel.send(msg);
								}, function(err) {
									colsole.log("Couldn't send found game .j author");
								});
								players[i].forEach(function (participant) {
									participant.createDM().then(function(channel) {
										channel.send(msg);
									}, function(err) {
										console.log("Couldn't send found game DMs.");
									});
									removePlayerAll(participant);
									removePlayerAll(sender); // Voodoo shit, won't remove the sender for some unknown reason.ll
								});
								break;
							}
						// If player already in PUG
						} else {
							message.channel.send("You're already in list **" + pugs[i].name + "**");
						}
					}
				}
				if (lfg) {
					message.channel.send(listactive());
				}
				writeData();
				break;
			
			
			// Remove another user from all PUGs
			case "adminremoveall":
				if (!message.member.roles.some(role => role.name === "PUGadmin")) {message.channel.send("Only PUGadmins can perform this command.");break;}
				sender = getUser(args[0]);
			
			
			// Leave all PUGs
			case "lva":
				removePlayerAll(sender);
				//message.channel.send("Removed **" + sender + "** from all lists.");
				message.channel.send(listactive());
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
					for (var i = 0; i < pugs.length; i++) {
						if (pugs[i].name == pugname) {
							removePlayer(i, sender);
							//message.channel.send("Removed **" + sender + "** from **" + pugname + "**");
						}
					}
					console.log("\n\n");
				});
				message.channel.send(listactive());
				writeData();
				break;
			
			
			case "promote":
			case "p":
				message.channel.send("Promote has been temporarily disabled.");
				break;
				if (args.length == 0) message.channel.send("@here\n" + listactive())
				else {
					var msg = "@here\n```fix\nFollowing PUG(s) were promoted by "+sender.username+"\n";
					args.forEach(function (arg) {
						for (var i = 0; i < pugs.length; i++) {
							if (pugs[i].name == arg) msg += "\n" + printPUG(i)
						}
					});
					msg += "```";
					message.channel.send(msg);
				}
				break;
			
			
			// List all PUGs with players registered
			case "listactive":
			case "lsa":
				message.channel.send(listactive());
				break;
			
			
			// List all PUGs
			case "list":
			case "ls":
				var msg = "```fix\nAll PUGs:\n";
				for (var i = 0; i < pugs.length; i++) {
					msg += "\n" + printPUG(i);
				}
				message.channel.send(msg + "```");
				break;
			
			
			// Repeat last PUG
			case "last":
				message.channel.send(last);
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
		let data = JSON.parse(d);
		last = data.last;
		players = toPlayers(data.players);
		link = data.invite;
		ch = toChannel(data.channel);
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
	if (newMember.presence.status == "offline") {
		if (removePlayerAll(newMember.user) && ch != ".") {
			ch.send("Removed "+oldMember.user.username+" from all lists because he/she went offline.\n\n"+listactive());
			console.log("Removed "+oldMember.user.username+" from all lists because he/she went offline.");
			writeData();
		}
	}
});

client.on("guildMemberAdd", (guildMember) => {
	var rich = new Discord.RichEmbed()
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

