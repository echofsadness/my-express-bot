const axios = require('axios');

async function getRoles(groupId, cookie) {
  const res = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
    headers: { 'Cookie': `.ROBLOSECURITY=${cookie}` }
  });
  return res.data.roles;
}

async function getUserRole(groupId, userId, cookie) {
  const res = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`, {
    headers: { 'Cookie': `.ROBLOSECURITY=${cookie}` }
  });
  return res.data.role;
}

async function setUserRole(groupId, userId, roleId, cookie) {
  await axios.post(
    `https://groups.roblox.com/v1/groups/${groupId}/users/${userId}/roles`,
    { roleId },
    {
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

async function promote(userId) {
  const groupId = process.env.GROUP_ID;
  const cookie = process.env.ROBLOSECURITY;

  const roles = await getRoles(groupId, cookie);
  const current = await getUserRole(groupId, userId, cookie);

  const index = roles.findIndex(r => r.rank === current.rank);
  if (index === -1 || index === roles.length - 1) throw new Error('Cannot promote further');

  const nextRole = roles[index + 1];
  await setUserRole(groupId, userId, nextRole.id, cookie);
  return nextRole;
}

async function demote(userId) {
  const groupId = process.env.GROUP_ID;
  const cookie = process.env.ROBLOSECURITY;

  const roles = await getRoles(groupId, cookie);
  const current = await getUserRole(groupId, userId, cookie);

  const index = roles.findIndex(r => r.rank === current.rank);
  if (index <= 0) throw new Error('Cannot demote further');

  const prevRole = roles[index - 1];
  await setUserRole(groupId, userId, prevRole.id, cookie);
  return prevRole;
}

module.exports = { promote, demote };
