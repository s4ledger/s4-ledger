{ pkgs }: {
  deps = [
    pkgs.python312
    pkgs.python312Packages.pip
    pkgs.python312Packages.virtualenv
    pkgs.sqlite
  ];
  env = {
    HORIZON_MODE = "dev";
    HORIZON_HOST = "0.0.0.0";
    HORIZON_PORT = "8088";
  };
}
