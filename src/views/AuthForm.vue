const handleSubmit = async () => {
  try {
    if (isLogin.value) {
      await signInWithEmailAndPassword(auth, email.value, password.value);
    } else {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      const user = userCred.user;

      // 🔥 FIX 2 : même clé que PlanSelection
      const plan = localStorage.getItem("selectedPlan") || "free";

      // 🔥 FIX 3 : structure SaaS stable
      await setDoc(doc(db, "users", user.uid), {
        email: email.value,
        username: email.value.split("@")[0],
        plan: plan,

        createdAt: new Date(),
        expiresAt: null,

        sections: [
          {
            id: crypto.randomUUID(),
            type: "Header",
            props: {
              title: "Bienvenue"
            }
          }
        ]
      });
    }

    router.push({ name: "Dashboard" });

  } catch (err) {
    alert(err.message);
  }
};
