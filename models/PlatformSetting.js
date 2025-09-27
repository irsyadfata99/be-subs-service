module.exports = (sequelize, DataTypes) => {
  const PlatformSetting = sequelize.define(
    "PlatformSetting",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
    },
    {
      tableName: "platform_settings",
      timestamps: true,
      underscored: true,
    }
  );

  return PlatformSetting;
};
