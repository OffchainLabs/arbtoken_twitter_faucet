import db from '../db'


export const tokenGenProcess = () => {
    const token = Math.random().toString(36).substr(2);

    db.insert({ token, requests: 0 }, (err, record)=>{
        if (err){
            console.warn(`error creating token`, err);
        } else {
            console.log('new token created:')
            console.log(record.token)
        }
    })
}

