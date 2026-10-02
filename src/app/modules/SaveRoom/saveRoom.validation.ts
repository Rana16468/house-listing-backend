import {z}  from 'zod';

 const saveRoomSchema = z.object({
    body: z.object({
        listRoomId: z.string({
            error: "listRoomId is required", 
        })
    })
});

const SaveRoomValidation = {
    saveRoomSchema
}
export default SaveRoomValidation;