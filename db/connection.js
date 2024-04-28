import mongoose from "mongoose";
import chalk from "chalk"; 

const connectionToDB = async () => {
	try {
		mongoose.set("strictQuery", false);
		const connect = await mongoose.connect(
			process.env.DATABASE, {
                useUnifiedTopology: true,
                useNewUrlParser: true
            }
		);
		console.log(
			`${chalk.blue.bold(
				`MongoDB Connected 👍`
			)}`
		);
	} catch (error) {
		console.error(`${chalk.red.bold(`Error: ${error.message}`)}`);
		process.exit(1); 
		
	}
};

export default connectionToDB;

// mongoose.connect(DB , {
//     useUnifiedTopology: true,
//     useNewUrlParser: true
// }).then(()=> console.log("Database Connected")).catch(err => console.log("Error",err))

// export default mongoose;