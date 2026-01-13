const User = require("../../models/userSchema");

const loadUserManage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";

    let searchQuery = { isAdmin: false };

    if (search && search !== "") {
      searchQuery = {
        isAdmin: false,
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      };
    }

    const totalUsers = await User.countDocuments(searchQuery);

    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("userManage", {
      activePage: "users",
      users,
      currentPage: page,
      totalUsers,
      limit,
      search: search,
      success: req.session.success || null,
      error: req.session.error || null,
    });

    delete req.session.success;
    delete req.session.error;
  } catch (error) {
    console.error("Error loading user manage page:", error);
    res.status(500).render("userManage", {
      users: [],
      currentPage: 1,
      totalUsers: 0,
      limit: 10,
      search: "",
      error: "Failed to load users",
    });
  }
};

const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Cannot block admin users",
      });
    }

    // Toggle status (true -> false, false -> true)
    user.status = !user.status;
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.status ? "unblocked" : "blocked"} successfully`,
      newStatus: user.status,
    });
  } catch (error) {
    console.error("Error toggling user status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  loadUserManage,
  blockUser,
};
