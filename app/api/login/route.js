const decodedToken = await auth.verifyIdToken(idToken);

const uid = decodedToken.uid;

// 1. 查询用户 RBAC
const userRef = db.collection("users").doc(uid);
const userSnap = await userRef.get();

if (!userSnap.exists) {
  return NextResponse.json(
    { error: "USER_NOT_REGISTERED" },
    { status: 403 }
  );
}

const userData = userSnap.data();

// 2. 检查用户状态
if (userData.Active !== true) {
  return NextResponse.json(
    { error: "USER_DISABLED" },
    { status: 403 }
  );
}

// 3. 查询角色
const roleId = userData.roleId;

if (!roleId) {
  return NextResponse.json(
    { error: "USER_HAS_NO_ROLE" },
    { status: 403 }
  );
}

const roleSnap = await db
  .collection("roles")
  .doc(roleId)
  .get();

if (!roleSnap.exists) {
  return NextResponse.json(
    { error: "INVALID_ROLE" },
    { status: 403 }
  );
}

const roleData = roleSnap.data();

if (roleData.active === false) {
  return NextResponse.json(
    { error: "ROLE_DISABLED" },
    { status: 403 }
  );
}

// 4. 验证完成后，创建 Session Cookie
const expiresIn = 4 * 60 * 60 * 1000;

const sessionCookie = await auth.createSessionCookie(
  idToken,
  { expiresIn }
);