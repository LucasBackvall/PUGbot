const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');

client.once('ready', () => {
	console.log('Ready!');
});
client.login(auth.token);


const prefix = '.';


client.on('message', message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

	switch (command) {
		case 'help':
			message.channel.send("No help available yet.");
			break;
		case 'testargs':
			if (!args.length) {
				return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
			} else {
				message.channel.send(`Command name: ${command}\nArguments: ${args}`);
			}
			break;
		case 'admincheck':
			if (message.member.roles.some(role => role.name === 'PUGadmin')) {
				message.channel.send("You're a PUG-admin.");
			} else {
				message.channel.send("You're not a PUG-admin.");
			}
			break;
	}
});

